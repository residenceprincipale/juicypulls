export function flickerAnimation(element) {
	let stopped = false
	function flicker() {
		if (stopped) return
		if (Math.random() < 0.3) {
			console.log('Flickering element:', element)
			element.style.opacity = 0.5 + Math.random() * 0.3
			setTimeout(
				() => {
					if (stopped) return
					element.style.opacity = 1
					setTimeout(flicker, 200 + Math.random() * 400)
				},
				50 + Math.random() * 70,
			)
		} else {
			setTimeout(
				() => {
					if (stopped) return
					flicker()
				},
				200 + Math.random() * 400,
			)
		}
	}
	flicker()
	return () => {
		stopped = true
		element.style.opacity = 1
	}
}
