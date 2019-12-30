        // "build": "rm -rf dist && tsc --build && terser dist/index.js -o dist/index.js --compress --mangle && cp project/package.json dist/package.json && cp README.md dist/README.md"


interface MilkProperty {
	query: string
	event: string
	then([state, set]: any): void
}

type MilkEvent = MilkProperty[]
interface Shadow {
	shadow: "open" | "closed"
}
type Hooks = { type: string } | Shadow | [any, Function] | {}

interface UseProps {
	type: "hookProp"
}

interface UseEffect {
	type: "hookLifecycle"
	callback(state: any, props: any): void
	listener: string[]
}

export const create = (
		execution: (display: Function, state: any, props: any) => null,
		hooks: Hooks = {},
		...properties: MilkEvent
	) =>
		class Milk extends HTMLElement {
			props: any
			state: any
			setState: any
			lifecycle: any
			prevState: any

			element: ShadowRoot

			constructor() {
				super()

				this.props = []
				this.state = {}
				this.setState = {}
				this.lifecycle = {}
				this.prevState = {}

				this.element = this.attachShadow({ mode: "closed" })

				this.initialize()
			}

			static get observedAttributes() {
				let observedProps: string[] = []

				Object.entries(hooks).forEach(([name, hook]) => {
					if (hook.type === "hookProp") return observedProps.push(name)
				})

				return observedProps
			}

			attributeChangedCallback(name: string, oldValue: any, newValue: any) {
				let attrValue = this.parseAttribute(name)

				this.props[name] = attrValue
				this.update()

				this.onPropsChange(name)
			}

			update() {
				let mappedState = this.mapState()[0],
					template = document.createElement("template")

				execution(
					(domString: string) => {
						template.innerHTML = this.reflect(domString)
						if (this.element.firstChild !== null)
							while (this.element.firstChild) this.element.firstChild.remove()

						this.element.appendChild(template.content.cloneNode(true))
					},
					mappedState,
					this.props
				)

				this.mapEvent()
			}

			initialize() {
				Object.entries(hooks).forEach(([name, hook]) => {
					switch (hook.type) {
						case "hookProp":
							let attrValue = this.parseAttribute(name)

							return (this.props[name] = attrValue)

						case "hookLifecycle":
							return (this.lifecycle[name] = {
								callback: hook.callback,
								listener: hook.listener
							})

						default:
							return ([this.state[name], this.setState[name]] = hook)
					}
				})
				return this.update()
			}

			onPropsChange(attributeName: string) {
				let mappedState = this.mapState()[0]

				Object.entries(this.lifecycle).forEach(
					([lifeCycleName, { listener, callback }]: any) => {
						if (listener.includes(attributeName))
							callback(mappedState, this.props)
					}
				)
			}

			callStateLifeCycle(prevState: any, state: any) {
				let diffState = Object.entries(state).filter(
						([name, value]) => prevState[name] !== value
					),
					mappedDiff = diffState.map(([name, value]) => name)

				Object.entries(this.lifecycle).forEach(
					([lifeCycleName, { listener, callback }]: any) => {
						mappedDiff.forEach(diffState => {
							if (listener.includes(diffState)) callback(state, this.props)
						})
					}
				)
			}

			mapState(state = this.state) {
				let mappedState = Object.assign({}, state)

				Object.entries(this.state).map(([name, hook]) => {
					if (typeof state[name] === "function")
						return (mappedState[name] = state[name]())
				})

				return [mappedState, this.setState]
			}

			mapEvent() {
				let mappedState = this.mapState()

				properties.map(property => {
					let { query, event, then } = property
					this.element.querySelector(query).addEventListener(event, () => {
						let prevState = this.mapState(Object.assign({}, this.state))[0]
						then(mappedState)
						let state = this.mapState(Object.assign({}, this.state))[0]

						this.callStateLifeCycle(prevState, state)
						this.update()
					})
				})
			}

			reflect(domString: string) {
				let newDom = `${domString}`.replace(/{children}/, "<slot></slot>")

				Object.entries(this.state).map(
					([name, hook]) =>
						(newDom = newDom.replace(
							new RegExp(`{${name}}`, "g"),
							this.state[name]()
						))
				)

				Object.entries(this.props).map(
					([name, hook]) =>
						(newDom = newDom.replace(
							new RegExp(`{${name}}`, "g"),
							this.props[name]
						))
				)

				return newDom
			}

			parseAttribute(name: string) {
				let attrValue: string | boolean = this.getAttribute(name) || ""

				if (attrValue === "true") attrValue = true
				else if (attrValue === "false") attrValue = false

				return attrValue
			}
		},
	define = (tagName: string, className: any) =>
		customElements.define(tagName, className),
	useState = (initValue: any) => {
		let _value = initValue,
			getValue = () => _value,
			setValue = (newValue: any) => (_value = newValue)

		return [getValue, setValue]
	},
	useProps = (): UseProps => ({
		type: "hookProp"
	}),
	useEffect = (
		callback: (state: any, props: any) => void,
		listener: string[]
	): UseEffect => {
		return {
			type: "hookLifecycle",
			callback: callback,
			listener: listener
		}
	}