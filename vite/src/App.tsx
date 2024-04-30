import {Link, Route, Routes} from "react-router-dom";

import './App.css'
import TokenizerPlayground from "./TokenizerPlayground.tsx";
import MAGNeTMutate from "./MAGNeTMutate.tsx";

function App() {
    //const [fooEvents, setFooEvents] = useState([]);

    return (
        <Routes>
            <Route path="/" element={
                <>
                    <div><Link to={"tokenizer-playground"}>TokenizerPlayground</Link></div>
                    <div><Link to={"magnet-mutate"}>MAGNeTMutate</Link></div>
                </>
            }/>
            <Route path="tokenizer-playground" element={<TokenizerPlayground/>}/>
            <Route path="magnet-mutate" element={<MAGNeTMutate />} />
        </Routes>
    )
}

export default App;
