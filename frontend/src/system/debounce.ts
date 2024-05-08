
export function debounce(callback, delay) {
  let timer
  return function() {
      console.log("starting timer")
    clearTimeout(timer)
    timer = setTimeout(() => {
      callback();
    }, delay)
  }
}