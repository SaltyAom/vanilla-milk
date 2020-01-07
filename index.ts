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

			attributeChangedCallback(name: string, oldValue: any, newValue: any) {
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

						default:
							return ([this.state[name], this.setState[name]] = hook)
					}
				})

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

				Object.entries(this.lifecycle).forEach(([name, hook]) => {
					let { callback }: any = hook
					callback(this.mapState(), this.props)
				})

				this.update()
			}

			update(): void {
				let template = document.createElement("template"),
					children = new String()

				Array.from(this.children).forEach(
					(node: any) => (children += node.outerHTML)
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
				while (templateChild.length < displayedChild.length) {
					template.appendChild(hidden.cloneNode(true))
				}

				templateChild.forEach((templateChildNode: HTMLElement, index) => {
					if (templateChildNode.isEqualNode(displayedChild[index])) return

					// Check if node is the same but text is different
					if (typeof displayedChild[index] !== "undefined") {
						let tempNode: Node = displayedChild[index].cloneNode(true),
							displayedContent = tempNode.textContent
						tempNode.textContent = templateChildNode.textContent

						if (tempNode.isEqualNode(templateChildNode))
							/* Content of style doesn't matter by whitespace and breakline */
							if(templateChildNode.nodeName === "STYLE"){
								let styleContent = templateChildNode.textContent.replace(/\n|\t|\ /g, ""),
									displayedStyle = displayedContent.replace(/\n|\t|\ /g, "")

								if(styleContent === displayedStyle)
									return
							} else 
								return (textDiff[index] = tempNode.textContent)
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
					displayedChild.forEach((displayedNode, index) => {
						if (index >= diff.length) return

						displayed.removeChild(displayedChild[index + 1])
					})

				textDiff.forEach(
					(text, index) =>
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

						if (typeof useEvents !== "undefined") {
							let mappedEvent = useEvents(this.mapState(), this.props)
							mappedEvent[invoke](e)
						}

						let state = this.mapState(Object.assign({}, this.state))[0]

						this.onStateChange(prevState, state)
						this.update()
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

				Object.entries(this.lifecycle).forEach(
					([lifeCycleName, { listener, callback }]: any) => {
						if (listener.includes(attributeName))
							callback(mappedState, this.props)
					}
				)
			}

			onStateChange(prevState: any, state: any): void {
				let diffState = Object.entries(state).filter(
						([name, value]) => prevState[name] !== value
					),
					mappedDiff = diffState.map(([name, value]) => name),
					mappedState = this.mapState()

				Object.entries(this.lifecycle).forEach(
					([lifeCycleName, { listener, callback }]: any) => {
						mappedDiff.forEach(diffState => {
							if (!listener.includes(diffState)) return

							callback(mappedState, this.props)
							this.update()
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
		callback: ([state, set]: any, props: any) => void,
		listener: string[]
	): UseEffect => ({
		type: "hookLifecycle",
		callback: callback,
		listener: listener
	}),
	useStyleSheet = (...stylesheets: string[]) => ({
		type: "hookStyleSheet",
		stylesheets: stylesheets
	})

const vanillaMilk = {
	create: create,
	define: define,
	useState,
	useProps,
	useEffect
}

export default vanillaMilk