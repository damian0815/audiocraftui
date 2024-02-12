
function GridElement({value}: {value: number}) {
    const top = Math.round(255*(value/64)/32)
    const bottom =  Math.round(64*(value%64)/64) + 192

    return <div className="element">
        <div className="half" id="msb" style={{background: `rgb(${top},${top},${top})`}} />
        <div className="half" id="lsb" style={{background: `rgb(${bottom},${bottom},${bottom})`}} />
    </div>
}

function GridRow({data}: {data: number[]}) {

    console.log("grid row with data", data)

    function renderRow(data) {
        const rowItems = []
        const cols = data.length
        for (let i = 0; i < cols; i++) {
            rowItems.push(<GridElement key={i} value={data[i]}/>)
        }
        return rowItems
    }

    return <>{ renderRow(data) }</>
}


export function TokensGrid({data}: {data: number[][]}) {

    console.log("TokensGrid with data", data)
    const rows = data.length
    if (rows == 0) {
        return <></>
    }
    const cols = data[0].length
    console.log(`${rows} rows, with ${cols} columns`)

    function renderGrid(data: number[][]) {
        const gridItems = []

        for (let i = 0; i < rows; i++) {
            gridItems.push(<GridRow key={i} data={data[i]}/>)
        }
        return gridItems;
    }

    return <div className="token-grid" style={{gridTemplateColumns: "repeat(" + cols + ", 1fr)"}}>{renderGrid(data)}</div>
}

