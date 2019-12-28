window.onload = () => {
	let helloWorld = milk.create(
		state => {
			// View
			if (state.counter === 1)
				display`
					<h1 id="display">Is One</h1>
					<p>Counter: {counter}</p>
					<button id="update">Update</button>
					`

			display`
				<h1 id="display">Isn't One</h1>
				<p>Counter: {counter}</p>
				<button id="update">Update</button>
			`
		},
		{
			// Initialize state, think of this as React.useState(value)
			"counter, setCounter": 0
		},
		// Create event (...arguments)
		{
			query: "#update",
			event: "click",
			then: state => {
				console.log(state)
				state.setCounter(state.counter + 1)
			}
		}
	)

	milk.define("hello-world", helloWorld)
}
