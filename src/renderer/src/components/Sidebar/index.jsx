// import React from "react";
// import { FaFolderOpen, FaMusic, FaVideo, FaList, FaSearch ,FaBars} from "react-icons/fa";
// import { IoMdDownload } from "react-icons/io";
// import { GiSquirrel } from "react-icons/gi";
// import squirrel from "../../assets/Images/squirrel.png";

// function Sidebar({ isOpen, setIsOpen }) {
//   return (
//     <div
//       className={`sidebar ${isOpen ? "expanded" : "collapsed"}`}
//       style={{
//         width: isOpen ? "250px" : "80px",
//         transition: "width 0.3s ease-in-out",
//         backgroundColor: "#f8f9fa",
//         color: "#333",
//         height: "83%",
//         position: "fixed",
//         left: 0,
//         // top: 90,
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         paddingTop: "20px",
//         boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
//         zIndex: 1000,
//       }}
//     >
//       {/* Toggle Button */}
//       {!isOpen && (
//         <button
//           onClick={() => setIsOpen(true)}
//           style={{
//             // backgroundColor: "#BB4F28",
//             border: "none",
//             color: "#BB4F28",
//             padding: "10px",
//             cursor: "pointer",
//             borderRadius: "5px",
          
//             marginBottom: "10px",
//           }}
//         >
//           <FaBars />
//         </button>
//       )}
      
//       {/* Recent Download Section */}
//       <div style={{ width: "90%", textAlign: "left", marginBottom: "10px" }}>
//         <h6 style={{ fontSize: "14px", color: "#BB4F28" }}>
//           <IoMdDownload style={{ marginRight: "5px" }} /> Recent Download
//         </h6>
//       </div>

//       {/* Sidebar Menu */}
//       <div style={{ width: "90%" }}>
//         {[
//           { icon: FaFolderOpen, label: "All Files" },
//           { icon: FaMusic, label: "Audio" },
//           { icon: FaVideo, label: "Video" },
//           { icon: FaList, label: "Playlist" },
//         ].map((item, index) => (
//           <div
//             key={index}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               padding: "10px 15px",
//               borderRadius: "8px",
//               cursor: "pointer",
//               marginBottom: "8px",
//               backgroundColor: "#fff",
//               boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
//             }}
//           >
//             <item.icon style={{ marginRight: "10px", color: "#BB4F28" }} />
//             {isOpen && <span>{item.label}</span>}
//           </div>
//         ))}
//       </div>

//       {/* Buy Me Nuts Button */}
//       {isOpen && (
//       <div
//         style={{
//           position: "absolute",
//           bottom: "20px",
//           width: "90%",
//           textAlign: "center",
//         }}
//       >
//          <img src={squirrel} alt="PNUT Logo" className="me-2" width={100} />
//         <button
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             width: "100%",
//             padding: "10px",
//             backgroundColor: "#BB4F28",
//             borderRadius: "8px",
//             border: "none",
//             color: "white",
//             fontSize: "14px",
//             cursor: "pointer",
//           }}
//         >
//           <GiSquirrel style={{ marginRight: "8px" }} /> Buy Me Nuts
//         </button>
//       </div>
//       )}
//     </div>
//   );
// }

// export default Sidebar;

import React, { useState } from "react";
import { FaFolderOpen, FaMusic, FaVideo, FaList, FaBars } from "react-icons/fa";
import { IoMdDownload } from "react-icons/io";
import { GiSquirrel } from "react-icons/gi";
import squirrel from "../../assets/Images/squirrel.png";
function Sidebar({ isOpen, setIsOpen ,selectedItem,setSelectedItem}) {
  

  const menuItems = [
    { icon: FaFolderOpen, label: "All Files" },
    { icon: FaMusic, label: "Audio" },
    { icon: FaVideo, label: "Video" },
    { icon: FaList, label: "Playlist" },
  ];

  return (
    <div
      className={`sidebar ${isOpen ? "expanded" : "collapsed"}`}
      style={{
        width: isOpen ? "250px" : "80px",
        transition: "width 0.3s ease-in-out",
        backgroundColor: "#f8f9fa",
        color: "#333",
        height: "83%",
        position: "fixed",
        left: 0,
        
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "20px",
        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      {/* Menu Button for Collapsed Mode */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: "#BB4F28",
            border: "none",
            color: "white",
            padding: "10px",
            cursor: "pointer",
            borderRadius: "5px",
            width: "90%",
            marginBottom: "10px",
          }}
        >
          <FaBars />
        </button>
      )}

      {/* Toggle Button */}
      

      {/* Recent Download Section */}
      <div style={{ width: "90%", textAlign: "left", marginBottom: "10px" }}>
        <h6 style={{ fontSize: "14px", color: "#BB4F28" }}>
          <IoMdDownload style={{ marginRight: "5px" }} /> Recent Download
        </h6>
      </div>

      {/* Sidebar Menu */}
      <div style={{ width: "90%" }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelectedItem(item.label)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 15px",
              borderRadius: "8px",
              cursor: "pointer",
              marginBottom: "8px",
              backgroundColor: selectedItem === item.label ? "#BB4F28" : "#fff",
              color: selectedItem === item.label ? "#fff" : "#333",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <item.icon
              style={{
                marginRight: "10px",
                color: selectedItem === item.label ? "#fff" : "#BB4F28",
              }}
            />
            {isOpen && <span>{item.label}</span>}
          </div>
        ))}
      </div>

      {/* Buy Me Nuts Button */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          width: "90%",
          textAlign: "center",
        }}
      >
        {isOpen && (
          <>
          <img
            src={squirrel}
            alt="PNUT Logo"
            className="me-2"
            style={{ width: "50px", marginBottom: "10px" }}
          />
        
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "10px",
            backgroundColor: "#BB4F28",
            borderRadius: "8px",
            border: "none",
            color: "white",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <GiSquirrel style={{ marginRight: "8px" }} /> Buy Me Nuts
        </button>
        </>

        )}
      </div>
    </div>
  );
}

export default Sidebar;
