type Hooks<T, K> = { type: K } | [K, Function] | { type: string } | {}

interface UseProps {
	type: "hookProp"
}

interface UseEffect {
	type: "hookLifecycle"
	callback(state: any, props: any): void
	listener: string[]
}

interface StoreEvent extends Event {
	detail: {
		name: string
		args: any
	}
}

export const create = <T, K extends keyof T>(
		execution: (
			display: Function,
			state: any,
			props: any,
			events: { [key: string]: ReturnType<keyof typeof useEvents> }
		) => string | void,
		hooks: Hooks<T, K> = {},
		useEvents?: ([set, state]: any, props: any) => any
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
			events: { [key: string]: string }
			observer: MutationObserver
			children: HTMLCollection
			stylesheet: {
				isLoaded: boolean
				totalLoaded: number
				source: string[]
				element: HTMLHeadElement
			}

			element: ShadowRoot

			constructor() {
				super()

				this.props = []
				this.state = {}
				this.setState = {}
				this.prevState = {}
				this.lifecycle = {}
				this.stylesheet = {
					isLoaded: false,
					totalLoaded: 0,
					source: [],
					element: null
				}

				this.element = this.attachShadow({ mode: "closed" })

				if (this.isReady()) this.initialize()
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

			attributeChangedCallback(name: string) {
				let attrValue = this.parseAttribute(name)

				this.props[name] = attrValue

				if (this.isReady()) this.update()

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

						case "hookStyleSheet":
							let styleSheetNode = document.createElement("head")
							styleSheetNode.setAttribute("id", "__vanilla_milk_stylesheet__")
							hook.stylesheets.forEach((source: string) => {
								let link = document.createElement("link")
								link.setAttribute("rel", "stylesheet")
								link.setAttribute("href", source)

								this.stylesheet.source.push(source)
								styleSheetNode.appendChild(link)
							})
							return (this.stylesheet.element = styleSheetNode)

						case "hookShareState":
							return Object.entries(hook.shared).forEach(
								([name, hook]: any) => {
									this.state[name] = hook[0]
									this.setState[name] = (args: typeof hook[0]) =>
										hook[1](args, name)
									hook[2].addEventListener("update", (event: StoreEvent) => {
										hook[1](event.detail.args, name, false)
										this.update()

										Object.entries(this.lifecycle).forEach(([_, hook]: any) =>
											hook.listener.includes(name)
												? hook.callback(this.mapState(), this.props)
												: null
										)
									})
								}
							)

						default:
							this.state[name] = hook[0]
							this.setState[name] = (args: typeof hook[0]) => {
								hook[1](args)
								this.update()
							}
					}
				})

				/* Hide component when stylesheet haven't finished loading */
				if (this.stylesheet.source.length) this.style.display = "none"

				this.observer = new MutationObserver(mutationsList =>
					mutationsList.forEach(() => this.update())
				)

				this.events =
					typeof useEvents !== "undefined"
						? useEvents(this.mapState(), this.props)
						: {}

				this.observer.observe(this, {
					childList: true,
					characterData: true,
					subtree: true
				})

				Object.entries(this.lifecycle).forEach(([_, hook]: any) =>
					hook.callback(this.mapState(), this.props)
				)

				this.update()
			}

			update(): void {
				let template = document.createElement("template"),
					children = new String()

				Array.from(this.children).forEach(
					({ outerHTML }) => (children += outerHTML)
				)

				let stylesheet = this.stylesheet.source.length
					? this.stylesheet.element.cloneNode(true)
					: null

				/* Skip event listener if all stylesheet is loaded */
				if (this.stylesheet.source.length && !this.stylesheet.isLoaded)
					stylesheet.childNodes.forEach(
						(doc: HTMLElement) => (doc.onload = () => this.onStylesheetLoaded())
					)

				let eventEntries: any = {}
				Object.keys(this.events).forEach(eventName => {
					eventEntries[eventName] = eventName
				})

				execution(
					(domString: string) => {
						let [parsedDomString, eventMap]: any = this.parseDomString(
							domString
						)

						template.innerHTML = parsedDomString

						if (stylesheet !== null)
							template.content.insertBefore(
								stylesheet,
								template.content.childNodes[0]
							)

						this.mapEvent(template, eventMap)
						this.milkDom(this.element, template.content)
					},
					this.mapState()[0],
					Object.assign(this.props, {
						children: this.children.length
							? children
							: this.textContent.replace(/\n|\t|\ \ /g, "")
					}),
					eventEntries
				)
			}

			milkDom(
				displayed: ShadowRoot | Node,
				template: HTMLTemplateElement | DocumentFragment,
				selfAdjust = true
			) {
				/* Remove blank tab and space from template string */
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
					textDiff: string[] = [],
					hardDiff: ChildNode[] = []

				let isInit = typeof displayed === "undefined",
					templateBeforeDiff = template.cloneNode(true) as HTMLTemplateElement,
					templateChildBeforeDiff = templateBeforeDiff.childNodes

				/* Handle child overwritten */
				let hidden = document.createElement("div")
				hidden.setAttribute("class", "__vanilla_milk_hidden__")
				while (templateChild.length < displayedChild.length)
					template.appendChild(hidden.cloneNode(true))

				templateChild.forEach((templateChildNode: HTMLElement, index) => {
					if (templateChildNode.isEqualNode(displayedChild[index])) return

					// Check if node is the same but text is different
					if (typeof displayedChild[index] !== "undefined") {
						let tempNode: Node = displayedChild[index].cloneNode(true),
							displayedContent = tempNode.textContent
						tempNode.textContent = templateChildNode.textContent

						if (tempNode.isEqualNode(templateChildNode))
							if (templateChildNode.nodeName === "STYLE") {
								/* Content of style doesn't matter by whitespace and breakline */
								let styleContent = templateChildNode.textContent.replace(
										/\n|\t|\ /g,
										""
									),
									displayedStyle = displayedContent.replace(/\n|\t|\ /g, "")

								if (styleContent === displayedStyle) return
							} else return (textDiff[index] = tempNode.textContent)
					}

					// Hard diff
					if (
						typeof displayedChild[index] !== "undefined" &&
						templateChildNode.nodeName !== displayedChild[index].nodeName
					)
						return (hardDiff[index] = templateChildNode)

					// Compare child
					let templateTemplate = new DocumentFragment()

					templateChildNode.cloneNode(true).childNodes.forEach(deepChild => {
						if (deepChild.nodeName === "#text") return

						templateTemplate.appendChild(deepChild)
					})

					// If there's different node and displayed isn't blank
					if (
						templateTemplate.childNodes.length &&
						typeof displayed.childNodes[index] !== "undefined"
					)
						return this.milkDom(displayed.childNodes[index], templateTemplate)

					diff[index] = templateChildNode
				})

				// Diff
				hardDiff.forEach((newNode: HTMLElement, index) => {
					if (typeof displayedChild[index] === "undefined")
						return displayed.insertBefore(newNode, displayedChild[index])

					if (newNode.getAttribute("class") === "__vanilla_milk_hidden__")
						return displayed.removeChild(displayedChild[index])

					displayed.replaceChild(newNode, displayedChild[index])
				})

				diff.forEach((newNode, index) => {
					if (typeof displayedChild[index] === "undefined")
						return displayed.insertBefore(newNode, displayedChild[index])

					if (displayed.childNodes[index].nodeName === "#text")
						return displayed.parentNode.replaceChild(
							newNode,
							displayed.parentNode.childNodes[index]
						)

					displayed.replaceChild(newNode, displayed.childNodes[index])
				})

				if (diff.length < displayedChild.length)
					displayedChild.forEach((_, index) => {
						if (index >= diff.length) return

						displayed.removeChild(displayedChild[index + 1])
					})

				textDiff.forEach(
					(_, index) =>
						(displayed.childNodes[index].textContent = textDiff[index])
				)

				/* Clean up */
				this.element
					.querySelectorAll(".__vanilla_milk_hidden__")
					.forEach(node => {
						node.parentNode.removeChild(node)
					})

				/* Use self-adjust on node removal */
				if (
					!isInit &&
					selfAdjust &&
					templateChildBeforeDiff.length < displayedChild.length
				)
					this.milkDom(
						displayed,
						templateBeforeDiff,
						displayedChild.length - templateChildBeforeDiff.length > 1
					)
			}

			onStylesheetLoaded() {
				if (++this.stylesheet.totalLoaded !== this.stylesheet.source.length)
					return

				this.style.display = null
				this.stylesheet.isLoaded = true
			}

			mapEvent(template: HTMLTemplateElement, eventMap: []) {
				eventMap.forEach(({ event, invoke }, index) => {
					let eventNode = template.content.getElementById(
						`__vanilla_milk_event_${index}__`
					)

					eventNode.addEventListener(event, (e: Event) => {
						let prevState = this.mapState(Object.assign({}, this.state))[0]

						if (typeof useEvents !== "undefined")
							useEvents(this.mapState(), this.props)[invoke](e)

						let state = this.mapState(Object.assign({}, this.state))[0]

						this.onStateChange(prevState, state)
					})

					let tempId = eventNode.getAttribute("__vanilla_milk_temp_id__")
					if (!tempId) return eventNode.removeAttribute("id")

					eventNode.setAttribute("id", tempId)
					eventNode.removeAttribute("__vanilla_milk_temp_id__")
				})
			}

			parseDomString(domString: string) {
				let index = 0,
					eventMap: any[] = []

				let parsedDom = domString.replace(
					/(?:\<)(?:[^\>]*)(?:\@)(?:[^\>]*)(?:\>)/gs,
					(tag: string) => {
						let hasId = /id/.exec(tag)

						if (hasId)
							tag = tag.replace(
								/id=("|')/gs,
								(_, quote) =>
									`id=${quote}__vanilla_milk_event_${index}__${quote} __vanilla_milk_temp_id__=${quote}`
							)

						tag = tag.replace(
							/@([a-zA-Z]+)=("|')([a-zA-Z]+)("|')/gs,
							(_, eventName, __, invoke) => {
								eventMap.push({
									event: eventName,
									invoke: invoke
								})

								if (hasId) return ""
								return `id="__vanilla_milk_event_${index}__"`
							}
						)

						index++
						return tag
					}
				)

				parsedDom = parsedDom.replace(
					/@hidden/g,
					`class="__vanilla_milk_hidden__"`
				)

				return [parsedDom, eventMap]
			}

			onPropsChange(attributeName: string): void {
				let mappedState = this.mapState()

				Object.entries(
					this.lifecycle
				).forEach(([_, { listener, callback }]: any) =>
					listener.includes(attributeName)
						? callback(mappedState, this.props)
						: null
				)
			}

			onStateChange(prevState: any, state: any): void {
				let diffState = Object.entries(state).filter(
						([name, value]) => prevState[name] !== value
					),
					mappedDiff = diffState.map(([name, _]) => name),
					mappedState = this.mapState()

				Object.entries(this.lifecycle).forEach(
					([_, { listener, callback }]: any) =>
						mappedDiff.forEach(diffState => {
							if (!listener.includes(diffState)) return

							callback(mappedState, this.props)
							this.update()
						})
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

			parseAttribute(name: string, deep = false): string | boolean | number | any[] {
				let attr: string | boolean | number | any[] = deep
					? name
					: this.getAttribute(name)

				switch (attr) {
					case "true":
						attr = true
						break

					case "false":
						attr = false
						break

					default:
						if (/^[-|+]?[0-9]*$/.test(attr)) {
							let temp = parseInt(attr, 10)
							if (!isNaN(temp)) attr = parseInt(attr, 10)
						}

						let temp = `${attr}`
						// Is array
						if (temp.slice(0, 1) === "[") {
							let tempArr: string[] = temp.replace(/\[|\]/g, "").split(","),
								parsedArr: any[] = []

							tempArr.forEach(arr => 
								parsedArr.push(this.parseAttribute(arr, true))
                            )
                            
                            attr = parsedArr
						}
				}

				return attr
			}

			isReady() {
				return (
					document.readyState === "interactive" ||
					document.readyState === "complete"
				)
			}
		},
	define = (tagName: string, className: ReturnType<typeof create>) =>
		!customElements.get(tagName)
			? customElements.define(tagName, className)
			: null,
	useState = <T>(initValue: T): [() => T, (newValue: T) => T] => {
		let _value = initValue,
			getValue = (): T => _value,
			setValue = (newValue: T) => (_value = newValue)

		return [getValue, setValue]
	},
	useProps = (): UseProps => ({
		type: "hookProp"
	}),
	useEffect = (
		callback: ([state, set]: ReturnType<typeof useState>, props: any) => void,
		listener: string[]
	): UseEffect => ({
		type: "hookLifecycle",
		callback: callback,
		listener: listener
	}),
	useStyleSheet = (...stylesheets: string[]) => ({
		type: "hookStyleSheet",
		stylesheets: stylesheets
	}),
	useShareState = <T>(stateHook: ReturnType<typeof useState>) => {
		let enhancedStateHook: any = { shared: {} }

		Object.entries(stateHook).forEach(([name, hook]: any) => {
			const store = new Store()

			let enhancedSet = (args: T, name: string, willDispatch = true) => {
				if (willDispatch) store.dispatch("update", args, name)

				return hook[1](args)
			}

			enhancedStateHook.shared[name] = [hook[0], enhancedSet, store]
		})

		return { type: "hookShareState", ...enhancedStateHook }
	},
	list = (HTMLArray: string[]) => {
        return `${HTMLArray.map((html) => html)}`.replace(/\,/g, "")
	}

class Store extends EventTarget {
	dispatch(name: string, args: any, stateName: string) {
		let event = new Event(name) as StoreEvent
		event.detail = { args: args, name: stateName }
		this.dispatchEvent(event)
	}
}

const vanillaMilk = {
	create: create,
	define: define,
	useState,
	useProps,
	useEffect,
	list
}

export default vanillaMilk
