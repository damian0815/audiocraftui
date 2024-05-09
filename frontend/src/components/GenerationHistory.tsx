import InfiniteScroll from 'react-infinite-scroll-component';
import {useContext, useEffect, useState} from "react";
import {GenerationOptions} from "../system/Audiocraft.tsx";
import {ServerContext} from "./ServerContext.tsx";
import {
    dark
} from "../../../../../Library/Caches/JetBrains/PyCharm2024.1/remote_sources/1901542340/-878163041/gradio/_frontend_code/plot/shared/utils.ts";

class GenerationData {
    uuid: string
    options: GenerationOptions
    timestamp: Date

    constructor(uuid: string, options: GenerationOptions, timestamp: Date) {
        this.uuid = uuid
        this.options = options
        this.timestamp = timestamp
    }
}

function GenerationItem({data, useAll}: {data: GenerationData, useAll: ((options: GenerationOptions) => void)}) {
    return <div className="generation-item">
        <div className={'prompt'}>{ data.options.prompt }</div>
        <div className={'buttons'}><button onClick={(e) => useAll(data.options)} >*</button></div>
    </div>
}


export function GenerationHistory({useAll}: {useAll: ((options: GenerationOptions) => void)}) {

    const serverInfo = useContext(ServerContext)
    const [items, setItems] = useState<GenerationData[]>([]);


    function fetchData() {
        const params = new URLSearchParams({
            limit: '20'
        });
        const url = serverInfo.baseUrl + "/generation_history?" + params
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(data)
                const fetchedItems = data
                    .map((v: any) => new GenerationData(v.uuid, v.generation_params, v.timestamp))
                    // remove existing items
                    .filter((f: any) => !items.find((v) => v.uuid === f.uuid))
                setItems(items.concat(fetchedItems));
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    function renderItems(items: GenerationData[]) {
        const nodes = []
        for (const item of items) {
            nodes.push(<GenerationItem key={item.uuid} useAll={useAll} data={item} />)
        }
        return nodes
    }

    return (
        <div className={"generation-history"}>
            <InfiniteScroll
                dataLength={items.length}
                next={fetchData}
                hasMore={true}
                loader={<h4>loading...</h4>}
                endMessage={
                    <p style={{ textAlign: 'center' }}>
                      <b>Yay! You have seen it all</b>
                    </p>
                  }
            >
                { renderItems(items) }
            </InfiniteScroll>
        </div>
    )

}

