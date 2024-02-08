
function GridElement({value}) {
    const top = Math.round(255*(value/64)/32)
    const bottom =  Math.round(64*(value%64)/64) + 192

    return <div className="element">
        <div className="half" id="msb" style={{background: `rgb(${top},${top},${top})`}} />
        <div className="half" id="lsb" style={{background: `rgb(${bottom},${bottom},${bottom})`}} />
    </div>
}

function GridRow({cols}) {

    function renderRow() {
        const rowItems = []
        for (let i = 0; i < cols; i++) {
            rowItems.push(<GridElement key={i} value={Math.floor(Math.random()*2048)}/>)
        }
        return rowItems
    }

    return <>{ renderRow() }</>
}


export function TokensGrid({cols, rows}) {

    function renderGrid() {
        const gridItems = []
        for (let i = 0; i < rows; i++) {
            gridItems.push(<GridRow key={i} cols={cols}/>)
        }
        return gridItems;
    }

    return <div className="token-grid" style={{gridTemplateColumns: "repeat("+cols+", 1fr)"}}>{ renderGrid() }</div>
}

