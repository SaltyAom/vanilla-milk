interface MilkProperty {
	query: string
	event: string | string[]
	then([state, set]: [
		{ [key: string]: any },
		{ [stateName: string]: Function }
	]): void
}

type MilkEvent = MilkProperty[]
type Hooks<T, K> = { type: K } | [K, Function] | { type: string } | {}

interface UseProps {
	type: "hookProp"
}

interface UseEffect {
	type: "hookLifecycle"
	callback(state: any, props: any): void
	listener: string[]
}

export const create = <T, K extends keyof T>(
		execution: (display: Function, state: any, props: any) => string | void,
		hooks: Hooks<T, K> = {},
		...properties: MilkEvent
	) =>
		class VanillaMilk extends HTMLElement {
			props: { [key: string]: any }
			state: { [stateName: string]: Function }
			setState: { [stateName: string]: Function }
			lifecycle: {
				[lifeCycleName: string]:
					| {
							callback(state: any, props: string | boolean | number): void
							listener: { [key: string]: any }
					  }
					| {}
			}
			prevState: { [stateName: string]: Function }
			observer: MutationObserver

			element: ShadowRoot

			constructor() {
				super()

				this.props = []
				this.state = {}
				this.setState = {}
				this.prevState = {}
				this.lifecycle = {}

				this.element = this.attachShadow({ mode: "closed" })

				if (
					document.readyState === "interactive" ||
					document.readyState === "complete"
				)
					this.initialize()
				else
					document.addEventListener("DOMContentLoaded", () => this.initialize())
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

				if (
					document.readyState === "interactive" ||
					document.readyState === "complete"
				)
					this.update()

				this.onPropsChange(name)
			}

			initialize(): void {
				Object.entries(hooks).forEach(([name, hook]: any) => {
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

				this.observer = new MutationObserver((mutationsList, observer) =>
					mutationsList.forEach(() => this.update())
				)

				this.observer.observe(this, {
					childList: true,
					characterData: true,
					subtree: true
				})

				this.update()
			}

			update(): void {
				let mappedState = this.mapState()[0],
					template = document.createElement("template"),
					a = document.createElement("template")

				execution(
					(domString: string) => {
						template.innerHTML = domString
						a.innerHTML = domString
						this.mapEvent(template)

						this.milkDom(this.element, template.content)
					},
					mappedState,
					Object.assign(this.props, {
						children: this.children.length
							? this.children
							: this.textContent.replace(/\n|\t|\ \ /g, "")
					})
				)
			}

			milkDom(
				displayed: ShadowRoot | Node,
				template: HTMLTemplateElement | DocumentFragment
			) {
				template.childNodes.forEach(templateChild => {
					if (
						templateChild.nodeName === "#text" &&
						templateChild.textContent.replace(/\t|\n|\ /g, "") === ""
					)
						template.removeChild(templateChild)
				})

				displayed.childNodes.forEach(displayedChild => {
					if (
						displayedChild.nodeName === "#text" &&
						displayedChild.textContent.replace(/\t|\n|\ /g, "") === ""
					)
						displayed.removeChild(displayedChild)
				})

				let templateChild = template.childNodes,
					displayedChild = displayed.childNodes

				let diff: ChildNode[] = [],
					textDiff: string[] = []

				templateChild.forEach((templateChildNode, index) => {
					if (templateChildNode.isEqualNode(displayedChild[index])) return

					// Check if node is the same but text is different
					if (typeof displayedChild[index] !== "undefined") {
						let tempNode: any = displayedChild[index].cloneNode(true)
						tempNode.textContent = templateChildNode.textContent

						if (tempNode.isEqualNode(templateChildNode))
							return (textDiff[index] = tempNode.textContent)
					}

					// Compare child
					let templateTemplate = document.createElement("template")

					templateChildNode.cloneNode(true).childNodes.forEach(deepChild => {
						if (deepChild.nodeName === "#text") return

						templateTemplate.content.appendChild(deepChild)
					})

					// If there's different node and displayed isn't blank
					if (
						templateTemplate.content.childNodes.length &&
						typeof displayed.childNodes[index] !== "undefined"
					)
						return this.milkDom(
							displayed.childNodes[index],
							templateTemplate.content
						)

					diff[index] = templateChildNode
				})

				diff.forEach((newNode, index) => {
					if (typeof displayedChild[index] === "undefined")
						return displayed.insertBefore(newNode, displayedChild[index])

					if (displayed.childNodes[index].nodeName === "#text")
						return displayed.parentNode.replaceChild(newNode, displayed.parentNode.childNodes[index])

					displayed.replaceChild(newNode, displayed.childNodes[index])
				})

				if (diff.length < displayedChild.length)
					displayedChild.forEach((displayedNode, index) => {
						if (index + 1 >= diff.length) return

						displayed.removeChild(displayedChild[index + 1])
					})

				textDiff.forEach((text, index) => {
					displayed.childNodes[index].textContent = textDiff[index]
				})
			}

			onPropsChange(attributeName: string): void {
				let mappedState = this.mapState()[0]

				Object.entries(this.lifecycle).forEach(
					([lifeCycleName, { listener, callback }]: any) => {
						if (listener.includes(attributeName))
							callback(mappedState, this.props)
					}
				)
			}

			stateLifeCycle(prevState: any, state: any): void {
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

			mapState(
				state = this.state
			): [{ [key: string]: any }, { [stateName: string]: Function }] {
				let mappedState = Object.assign({}, state)

				Object.entries(this.state).map(([name, hook]) => {
					if (typeof state[name] === "function")
						return (mappedState[name] = state[name]())
				})

				return [mappedState, this.setState]
			}

			mapEvent(template: HTMLTemplateElement): void {
				properties.map(property => {
					let { query, event, then } = property,
						eachEvent = Array.isArray(event)
							? event
							: event.replace(/ /g, "").split(",")

					eachEvent.forEach(eventName =>
						template.content
							.querySelector(query)
							.addEventListener(eventName, () => {
								let mappedState = this.mapState(),
									prevState = this.mapState(Object.assign({}, this.state))[0]

								then(mappedState)
								let state = this.mapState(Object.assign({}, this.state))[0]

								this.stateLifeCycle(prevState, state)
								this.update()
							})
					)
				})
			}

			parseAttribute(name: string): string | boolean | number {
				let attrValue: string | boolean | number = this.getAttribute(name)

				switch (attrValue) {
					case "true":
						attrValue = true
						break

					case "false":
						attrValue = false
						break

					default:
						if (/^[-|+]?[0-9]*$/.test(attrValue)) {
							let temporyValue = parseInt(attrValue, 10)
							if (!isNaN(temporyValue)) attrValue = parseInt(attrValue, 10)
						}
				}

				return attrValue
			}
		},
	define = (tagName: string, className: ReturnType<typeof create>) =>
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

const vanillaMilk = {
	create: create,
	define: define,
	useState,
	useProps,
	useEffect
}

export default vanillaMilk