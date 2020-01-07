/**
 * @jest-environment jsdom
 */
import { create, define, useState } from "../index"

describe("Vanilla Milk", () => {
    it("should create Milk Component", () => {
        const MilkComponent = create(display =>
            display(`<h1>Milk Components!</h1>`)
        )

        expect(MilkComponent).toBeTruthy()
    })
})
