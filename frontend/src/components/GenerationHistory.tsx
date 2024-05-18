import InfiniteScroll from 'react-infinite-scroll-component';
import {useContext, useEffect, useRef, useState} from "react";
import {GenerationOptions} from "../system/Audiocraft.tsx";
import {ServerContext} from "./ServerContext.tsx";
import WavesurferPlayer from "@wavesurfer/react";

import PubSub from "pubsub-js";

import './GenerationHistory.css'
import useTraceUpdate from "../system/useTraceUpdate.tsx";

class GenerationData {
    uuid: string
    options: GenerationOptions
    tokens: number[][]
    timestamp: Date
    audioUrl: string

    constructor(uuid: string, options: GenerationOptions, tokens: number[][], timestamp: Date, audioUrl: string) {
        this.uuid = uuid
        this.options = options
        this.tokens = tokens
        this.timestamp = timestamp
        this.audioUrl = audioUrl
    }
}

function GenerationItem({data, useAll, loadAudio, loadTokens}: {
    data: GenerationData,
    useAll: ((options: GenerationOptions) => void),
    loadAudio: ((uuid: string) => void),
    loadTokens: ((tokens: number[][]) => void)
}) {

    return <div className="generation-item">
        <div className={'timestamp'}>{data.timestamp.toLocaleString()}</div>
        <div className={'prompt'}>{data.options.prompt}</div>
        <WavesurferPlayer
            url={data.audioUrl}
            waveColor={'purple'}
            height={30}
            mediaControls={true}
            />
        <div className={'buttons'}>
            <button onClick={(e) => useAll(data.options)}>️⚙️</button>
            <button onClick={(e) => loadAudio(data.uuid)}>🎶</button>
            <button onClick={(e) => loadTokens(data.tokens)}>🎟️</button>
        </div>
    </div>
        }


export function GenerationHistory(props:  {
    useAll: (options: GenerationOptions) => void,
    loadAudio: (uuid: string) => void,
    loadTokens: (tokens: number[][]) => void
}) {

    useTraceUpdate(props)

    const {useAll, loadAudio, loadTokens} = props

    const serverInfo = useContext(ServerContext)
    const [items, setItems] = useState<GenerationData[]>([]);


    function fetchData(reason: string|null =null) {
        const lastItems = items
        const params: any = {
            'limit': 20
        }
        if (lastItems.length) {
            params['cursorUuid'] = lastItems[lastItems.length-1].uuid
            params['cursorTimestamp'] = lastItems[lastItems.length-1].timestamp
        }
        const url = serverInfo.baseUrl + "/generation_history?" + new URLSearchParams(params)
        function makeAudioUrl(uuid: string) {
            return serverInfo.baseUrl + "/audio/" + uuid
        }

        console.log("fetching", url, "because", reason)
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("fetched because", reason, ":", data)
                const fetchedItems = data
                    .map((v: any) => new GenerationData(v.uuid, v.generation_params, v.tokens, v.timestamp, makeAudioUrl(v.uuid)))
                    // remove existing items
                    .filter((f: any) => !lastItems.find((v) => v.uuid === f.uuid))
                setItems(lastItems.concat(fetchedItems));
            })
    }

    useEffect(() => {
        fetchData("GenerationHistory-useEffect")
        PubSub.subscribe("AudiocraftGenerationComplete", () => { fetchData("pubsub")})
    }, [])

    function renderItems(items: GenerationData[]) {
        const nodes = []
        for (const item of items.slice().reverse()) {
            nodes.push(<GenerationItem key={item.uuid}
                                       useAll={useAll}
                                       loadAudio={loadAudio}
                                       loadTokens={loadTokens}
                                       data={item} />)
        }
        return nodes
    }

    return (
        <div className={"generation-history"}>
            <InfiniteScroll
                dataLength={items.length}
                next={() => fetchData("InfiniteScroll-next")}
                hasMore={false}
                loader={<h4>loading...</h4>}
                endMessage={
                    <p style={{ textAlign: 'center' }}>
                        -- end --
                    </p>
                  }
            >
                { renderItems(items) }
            </InfiniteScroll>
        </div>
    )

}

