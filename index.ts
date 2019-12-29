interface IProperty {
    query: string
    event: Event
    then([state, set]:any): any
}

type TProperty = IProperty[]
type Hooks = { type: string } | [any, Function] | {}

export const create = (execution: Function, hooks: Hooks = {}, ...properties: TProperty) =>
		class Milk extends HTMLElement {
			props: any
			state: any
			setState: any

			element: any
			attachShadow: any

			constructor() {
				super()

				this.props = []
				this.state = {}
				this.setState = {}

				this.element = this.attachShadow({ mode: "closed" })

				this.initState()
				this.update()
			}

			static get observedAttributes() {
				let observedProps: string[] = []

				Object.entries(hooks).forEach(([name, hook]) => {
					if (hook.type === "hookProp") return observedProps.push(name)
				})

				return observedProps
			}

			attributeChangedCallback(name: string, oldValue: any, newValue: any) {
				this.props[name] = newValue
				this.update()
			}

			update() {
				let mappedState = this.mapState()[0]

				execution(
					(dom: string) => (this.element.innerHTML = this.reflectState(dom)),
					mappedState,
					this.props
				)

				this.mapEvent()
			}

			initState() {
				Object.entries(hooks).forEach(([name, hook]) => {
					switch (hook.type) {
						case "hookProp":
							return (this.props[name] = this.getAttribute(name) || "")

						default:
							return ([this.state[name], this.setState[name]] = hook)
					}
				})
			}

			mapState() {
				let mappedState = Object.assign({}, this.state)

				Object.entries(this.state).map(
					([name, hook]) => (mappedState[name] = this.state[name]())
				)

				return [mappedState, this.setState]
			}

			mapEvent() {
				let mappedState = this.mapState()

				properties.map(property => {
					let { query, event, then } = property
					this.element.querySelector(query).addEventListener(event, () => {
						then(mappedState)
						this.update()
					})
				})
			}

			reflectState(dom: string) {
				let newDom = `${dom}`.replace(/{children}/, "<slot></slot>")

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
		},
	define = (tagName: string, className: any) => customElements.define(tagName, className),
	useState = (initValue: any) => {
		let _value = initValue,
			getValue = () => _value,
			setValue = (newValue: any) => (_value = newValue)

		return [getValue, setValue]
	},
	useProps = () => {
		return {
			type: "hookProp"
		}
	}

export default {
	create: create,
	define: define,
	useState: useState,
	useProps: useProps
}
