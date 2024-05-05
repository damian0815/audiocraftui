
import './TokensGrid.css'

function GridElement({value, width}: {value: number, width: number}) {
    const hue = 360 * value/2048
    return <div className="element" style={{background: `hsl(${hue}, 100%, 50%)`, width: `${width}px`}} />
}

function GridRow({data, perTokenWidth}: {data: number[], perTokenWidth: number}) {

    //console.log("grid row with data", data)

    function renderRow(data: number[]) {
        /*const rowItems = data.map((v, i) =>
            <GridElement key={i} value={v} width={perTokenWidth}/>
        )*/
        const rowItems = []
        const cols = data.length
        for (let i = 0; i < cols; i++) {
            rowItems.push(<GridElement key={i} value={data[i]} width={perTokenWidth}/>)
        }
        return rowItems
    }

    return <>{ renderRow(data) }</>
}


type TokensGridProps = {
    data: number[][];
    width: number;
    tokensModifiedCallback?: (tokens: number[][]) => void;
}

export function TokensGrid(props: TokensGridProps) {

    const { data, width, tokensModifiedCallback } = props

    //console.log("TokensGrid with data", data)
    const rows = data.length
    if (rows == 0) {
        return <></>
    }
    const cols = data[0].length
    const perTokenWidth = width/cols;
    console.log(`${rows} rows, with ${cols} columns, per-token width ${perTokenWidth}`)

    function renderGrid(data: number[][]) {
        const gridItems = []

        for (let i = 0; i < rows; i++) {
            gridItems.push(<GridRow key={i} data={data[i]} perTokenWidth={perTokenWidth}/>)
        }
        return gridItems;
    }

    return (
        <div>
            { tokensModifiedCallback && <>
                <button onClick={ ()=>{ data[0].push(data[0].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
                <button onClick={ ()=>{ data[1].push(data[1].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
                <button onClick={ ()=>{ data[2].push(data[2].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
                <button onClick={ ()=>{ data[3].push(data[3].shift()!); tokensModifiedCallback(data) } } > &lt; </button>
            </> }
            <div className="token-grid" style={{gridTemplateColumns: "repeat(" + cols + ", 1fr)"}}>
                {renderGrid(data)}
            </div>
            { tokensModifiedCallback && <>
                <button onClick={ ()=>{ data[0].splice(0, 0, data[0].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
                <button onClick={ ()=>{ data[1].splice(0, 0, data[1].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
                <button onClick={ ()=>{ data[2].splice(0, 0, data[2].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
                <button onClick={ ()=>{ data[3].splice(0, 0, data[3].pop()!); tokensModifiedCallback(data) } } > &gt; </button>
            </>}
        </div>
    )
}

