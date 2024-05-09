import InfiniteScroll from 'react-infinite-scroll-component';
import {useState} from "react";
import {GenerationOptions} from "../system/Audiocraft.tsx";

class GenerationItem {
    uuid: string
    options: GenerationOptions
}

export function GenerationHistory() {

    function fetchData() {


        setItems(items.concat(fetchedItems));
    }

    const [items, setItems] = useState<GenerationItem[]>([]);


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
                {items}
            </InfiniteScroll>
        </div>
    )

}

