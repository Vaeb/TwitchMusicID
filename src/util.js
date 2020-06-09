export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const chunkBy = (arr, size) => arr.reduce((all, one, i) => {
    const ch = Math.floor(i / size);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
}, []);
