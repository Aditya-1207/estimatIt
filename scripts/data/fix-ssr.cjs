const fs = require('fs');
const file = 'd:/projects/estimatIt/scripts/data/ssr.json';

// Read data
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// The SR numbers to merge
const targetSrs = [2139, 2140, 2143, 2144, 2146, 2147, 2148, 2149, 2151];

let newData = [];
let i = 0;

while (i < data.length) {
    let item = data[i];
    
    // Create a new copy to avoid mutating the original object directly if not needed
    // though it's fine since we parsed it fresh.
    newData.push(item);

    if (targetSrs.includes(item.sr_no)) {
        let j = i + 1;
        // Keep looking forward for objects that have sr_no: null and item_no: ""
        while (j < data.length && data[j].sr_no === null && data[j].item_no === "") {
            newData[newData.length - 1].description += "\n\n" + data[j].description;
            j++;
        }
        // Advance i past the merged items
        i = j;
    } else {
        i++;
    }
}

// Write the fixed data back
fs.writeFileSync(file, JSON.stringify(newData, null, 2));

console.log('Merge complete. New array length: ' + newData.length + ', Old: ' + data.length);
