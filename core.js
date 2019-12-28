let milk = {
	create: (execution, states = {}, ...properties) =>
		class Milk extends HTMLElement {
			constructor() {
				super()

				this.state = {}
				this.element = this.attachShadow({ mode: "closed" })

				this.initState()
				this.update()
			}

			update() {
				let mappedState = this.mapState()

				let ex = `${this.reflectState(execution)}`.replace(
					/display`/g,
					"return this.element.innerHTML = `"
				)
				eval(`(${ex})(mappedState)`)

				this.mapEvent()
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

			initState() {
				return Object.entries(states).forEach(([name, initState]) => {
					let stater = name.replace(/ /g, "").split(","),
						[value, set] = stater

					return ([this.state[value], this.state[set]] = milk.useState(
						initState
					))
				})
			}

			mapState() {
				let mappedState = Object.assign({}, this.state)

				Object.entries(states).map(([name, initState]) => {
					let stater = name.replace(/ /g, "").split(","),
						[state, setState] = stater

					mappedState[state] = this.state[state]()
				})

				return mappedState
			}

			reflectState(dom) {
				let newDom = `${dom}`.replace(/{children}/, "<slot></slot>")

				Object.entries(states).map(([name, initState]) => {
					let stater = name.replace(/ /g, "").split(","),
						[state, setState] = stater

					newDom = newDom.replace(new RegExp(`{${state}}`,"g"), this.state[state]())
				})

				return newDom
			}
		},
	define: (tagName, className) => customElements.define(tagName, className),
	useState: initValue => {
		let _value = initValue,
			getValue = () => _value,
			setValue = newValue => (_value = newValue)

		return [getValue, setValue]
	}
}