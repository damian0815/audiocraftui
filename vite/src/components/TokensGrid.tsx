
function GridElement({value}: {value: number}) {
    const hue = 360 * value/2048
    return <div className="element" style={{background: `hsl(${hue}, 100%, 50%)`}} />
}

function GridRow({data}: {data: number[]}) {

    //console.log("grid row with data", data)

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


export function TokensGrid({data, tokensModifiedCallback}:
                               {
                                   data: number[][],
                                   tokensModifiedCallback: (tokens: number[][]) => void
                               }) {

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
            gridItems.push(<GridRow key={i} data={data[i]} />)
        }
        return gridItems;
    }

    return (
        <div>
            <button onClick={ ()=>{ data[0].push(data[0].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
            <button onClick={ ()=>{ data[1].push(data[1].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
            <button onClick={ ()=>{ data[2].push(data[2].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
            <button onClick={ ()=>{ data[3].push(data[3].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
            <div className="token-grid" style={{gridTemplateColumns: "repeat(" + cols + ", 1fr)"}}>
                {renderGrid(data)}
            </div>
            <button onClick={ ()=>{ data[0].splice(0, 0, data[0].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
            <button onClick={ ()=>{ data[1].splice(0, 0, data[1].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
            <button onClick={ ()=>{ data[2].splice(0, 0, data[2].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
            <button onClick={ ()=>{ data[3].splice(0, 0, data[3].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
        </div>
    )
}

