export function shuffle(array: unknown[], seed: number) {                // <-- ADDED ARGUMENT
  let m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(random(seed) * m--);        // <-- MODIFIED LINE

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    ++seed                                     // <-- ADDED LINE
  }

  return array;
}

function random(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}