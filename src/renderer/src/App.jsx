import React,{useState} from "react";
import Navbar from "./components/Navbar"; // Make sure the file is saved as Navbar.jsx
import BottomSection from "./components/BottomSection";

function App() {
  const [downloadType, setDownloadType] = useState("Video");
  const [quality, setQuality] = useState("1080p");
  const [format, setFormat] = useState("");
  const [saveTo, setSaveTo] = useState("Downloads");
  return (
    <div className="d-flex flex-column vh-100">
      {/* Navbar at the Top */}
      <Navbar 
       downloadType={downloadType}
       setDownloadType={setDownloadType}
       quality={quality}
       setQuality={setQuality}
       format={format}
       setFormat={setFormat}
       saveTo={saveTo}
       setSaveTo={setSaveTo}
      />

      {/* Bottom Section */}
      <BottomSection
       downloadType={downloadType}
       quality={quality}
       format={format}
       saveTo={saveTo}
      />
    </div>
  );
}

export default App;