# Vanilla Milk
Simple library for building simple reactive web components.
  
## What is...
Vanilla Milk create component which is can be used on any view library or framework of your choice! Embrace future of web-component made it future-proof. Built-in reactive state and props but also is very small and fast.

Vanilla Milk feature:
* Reusable component.
* Simple way for creating web components.
* Reactive state and props.
* Life-cycle hooks.
* Expressive Vanilla like API structure.
* Very small (1kB gzipped on production).
* Encapsulated style, ID and class name.
* Zero dependencies.
* TypeScript support.

## Getting started
Glad you're interested in! Let's get over quick start! Let us add library just for creating a component, after the component has been built, you don't have to install it anymore! Just moved the built components to your any project~

### Install Vanilla Milk
Let install this real quick with package manager of your choice.
```bash
// Using npm
npm install vanilla-milk --save

// Using yarn
yarn add vanilla-milk
```
Well done! Now you're ready to create a Milk Component! (Shortname for Vanilla Milk Component for the greater good.)
  
### Hello World! It's Milk Component!
Let's start by building `milk-component', a traditional hello world for programmer but as web component.

Milk Component are separated into 2 step:
1) Define it with `create`
2) Create it with `define`

Just 2 step, that's all for building reactive web component.

#### Create
First of all, import `create` function from vanilla-milk. This function is responsible to create a model of component.
```javascript
import { create } from "vanilla-milk"
```

First parameter is a callback to display HTML Element.
```javascript
import { create } from "vanilla-milk"

const MilkComponent = create((display) => 
	display(`<h1>Hello World! Milk Component!</h1>`)
)
```
We have just create `MilkComponent` which will return `<h1>Hello World</h1>`  

### Define
Next we just have to `define` this component, so it can work like every HTML Element.  
But first, import `define` from `vanilla-milk`
```javascript
import { define } from "vanilla-milk"
```

Now let's name the component `milk-element`, so it can be use in HTML. (Web Component need `-` to be declared, like `milk-component` which has `-` in it)
```javascript
import { create, define } from "vanilla-milk"

const MilkComponent = create((display) => 
	display(`<h1>Hello World! Milk Component!</h1>`)
)

define("milk-component", MilkComponent)
```
That's it! You have just created a Milk Component!! :tada::tada:
  
#### Milk Component in action
Soooo~ We have just created a web component, let's see it in action!  
Just add `<milk-component></milk-component>` in HTML. Make sure you've link the JavaScript file which contain milk component in it. You can use quick set-up like `parcel`.
```html
<!-- Any HTML here -->
<html>
<head>
	<title>Hello Milk Component</title>
    <script src="milk_component_here.js"></script>
</head>
<body>
	<milk-component></milk-component>
</body>
</html>
```
And it should display something like this.
  
#### But that's not what make Vanilla Milk special...
In Vanilla Milk, component are reactive which mean every time `state` or `props` changed, Milk Component will know it.

## State
Like `angular`, `react` and `vue`, Vanilla Milk also has `state`.  
State is like a variable which are responsible for storing data and display it to view.

Let's say we want to create a counter and display count to view. In Vanilla Milk we do like this.
  
If you're familiar with React, we have `useState`. But it's not like what you might think.
```javascript
import { useState } from 'vanilla-milk'
```
Vanilla Milk are designed to be expressive. So we separate the state, props and life-cycle to the second parameter of `create` like this.
```javascript
import { create, define, useState } from "vanilla-milk"

const MilkComponent = create((display, state) => {
	let { count } = state
    
	return display(`<h1>Count ${count}</h1>`)
},
{
	counter: useState(0)
})

define("milk-component", MilkComponent)
```
So, what's happend here?
  
The second parameter of `create` are responsible for handling data, so we can separate and focus on each part.
```
{
	count: useState(0)
}
```
Here we defined state name `count` with value of `0`. `useState` is a function that say, "Hey! We want a state name 'count' with value of 0" to Vanilla Milk or something like that. Vanilla Milk will just handle the rest of that and pass the `count` to the `second parameter` of the view callback.
```
const MilkComponent = create((display, state) => {
	console.log(state) // { count: 0 }
},
{
	count: useState(0)
})
```
Lastly, we display counter to the view.
```javascript
import { create, define, useState } from "vanilla-milk"

const MilkComponent = create((display, state) => {
	return display(`<h1>Count ${state.count}</h1>`)
},
{
	count: useState(0)
})

define("milk-component", MilkComponent)
```
Now that will display `count` to HTML, so... how do we set it in Vanilla Milk?
  
As an early state of development of Vanilla Milk that's where the last parameter of `create` kick in!  
We add button and attach event in to it, so we can change the value of `counter`. // Hey don't make face of disappointment like that! I'll fix it in some next update, I promise! It's quite hard to create something like that ya know.
  
Let add a button.
```javascript
import { create, define, useState } from "vanilla-milk"

const MilkComponent = create((display, state) => {
	return display(`
    	<h1>Count ${state.count}</h1>
        <button id="increase-count">Increase count</button>
	`)
},
{
	count: useState(0)
})

define("milk-component", MilkComponent)
```
Like in Vanilla JavaScript, we `query` an element, add `event` in to it `then` create a callback to do what we want! That's also how it work in Vanilla Milk but it's shorten!
```javascript
import { create, define, useState } from "vanilla-milk"

const MilkComponent = create((display, state) => {
	return display(`
    	<h1>Count ${state.count}</h1>
        <button id="increase-count">Increase count</button>
	`)
},
{
	count: useState(0)
},
{
	query: "#increase-count",
    event: "click",
    then: ([state, set]) => {
    	set.count(state.count + 1)
    }
})

define("milk-component", MilkComponent)
```
We have just said something like `when ID 'increase-count' is clicked then do something`.
Notice that we have `[state, set]` in callback of `then`, this is where you can `access and set value of state`.
```javascript
then: ([state, set]) => {
	set.count(state.count + 1)
}
```
At here we get value of `count` from `state.count` and set it with `set.count` which came out with something like this:
```javascript
set.count(0 + 1) // Count is now 1
```
Now it should increase the value of count everytime we click it!

That's it! You've just achieve an advance concept like state of Vanilla Milk :tada::tada:

## Props
Contrast to state, it's super simple. props is shorten for `properties`. A property is like a HTML attribute. For a button like:
```html
<button class="nice-button">Hello! I'm a button</button>
```
class is a props of this button and it's value is "nice-button".
  
As Milk Component, we also can have something like that! and guess what? You can create any attribute you like effortlessly!
  
All you have to do is import `useProps` from `vanilla-milk` and set it like `useState`.
```javascript
import { useProps } from "vanilla-milk"
```
Now let's say that we want to have a prop name `hello`. Like `useState` we do it like this:
```javascript
{
	count: useState(0),
	hello: useProps()
}
```
And access it like state
```javascript
create((display, state, props) => {
	console.log(props.hello) // null if there's no value passed
})
```
So let's define the component real quick to see how it work.
```javascript
import { create, define, useProps } from "vanilla-milk"

const MilkComponent = create((display, state, props) => {
	return display(`<h1>hello ${props.hello}</h1>`)
},{
	hello: useProps()
})

define("milk-component", MilkComponent)
```
And in HTML
```html
<milk-component hello="world"></milk-component> // hello world
```
The reason we have to define `props` so that Vanilla Milk can just update and listen only to the props you used! 
  
But there's one special props which is available... `children`

In HTML:
```html
<milk-component>Hello World</milk-component>
```
And access it:
```javascript
const MilkComponent = create((display, state, props) => {
	console.log(props.children) // Hello World
})
```
That's it! Unlike `useState`, `useProps` is super to use! :tada::tada:

## useEffect
Like React, you can defined lifecycle with `useEffect`.
  
Let's say, that you want to `console.log()` everytime prop `hello` change. You just have to import `useEffect` from `vanilla-milk`.
```javascript
import { useEffect } from "vanilla-milk"
```
Again, add it to second paramter of `create` like `useState` and `useProps`
```javascript
{
	hello: useProps(),
	logHello: useEffect((state, props) => {
    	console.log(props.hello) // Log everytime hello changed
    }, ["hello"])
}
```
Notice that we add array contain "hello" as string as the second parameter of useEffect.
Because we can't directly access value of hello so we just add it as string, Vanilla Milk will take care of the rest (In fact, we can add it as variable but it takes an extra effort and performance cost).

You can express name of `useEffect` as anything, It just easier to remind you lifecycle with name if there are too much lifecycle.

Now we hello is changed, first callback will run. Like view callback, useEffect is paired with `(state, props)`. You can directly access it in the callback.
  
That's pretty much it of Vanilla Milk 0.1.2. :tada::tada:
I'm looking for implement more functionality to this project soon! ps. vdom are also planned to be added in the future~ Stay tuned!