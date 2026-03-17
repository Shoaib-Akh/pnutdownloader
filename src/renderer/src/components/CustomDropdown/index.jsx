import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { FaCheck, FaAngleDown } from "react-icons/fa";

function CustomDropdown({ label, options, selected, onSelect, renderOption, renderSelected ,width}) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayValue = (option) => {
    if (typeof option === 'object') return option?.label || option?.value;
    return option;
  };
  const getTextColor = () => {
    return document.documentElement.classList.contains('dark-theme') ? "#BB4F28" : '#BB4F28;';
  };
  return (
    <Dropdown onToggle={(isOpen) => setIsOpen(isOpen)}>
      <Dropdown.Toggle
        variant="light"
        id="custom-dropdown"
        style={{
         backgroundColor:isOpen ?  "rgb(231 231 231)":"transparent" ,
          lineHeight: "35px",
          color: isOpen ? "black" : getTextColor(),
          padding: "0 10px",
          // border: "none",
          display:"flex",
          justifyContent:"center",
          alignItems:"center",
          // minWidth:width,
        }}
      >
        <span style={{ color: "black",fontSize:12,fontWeight:"500" }}>{label}:  </span>{" "}
        <span style={{ color: getTextColor(),paddingLeft:3,fontSize:13,fontWeight:"500"}}>
          {renderSelected ? renderSelected(selected) : getDisplayValue(options.find(opt => 
            (typeof opt === 'object' ? opt.value : opt) === selected) || selected
          )}
        </span>
        <FaAngleDown
          className={`ms-1 transition ${isOpen ? "rotate-180" : ""}`}
          style={{ color: getTextColor() }}
        />
      </Dropdown.Toggle>

      <Dropdown.Menu
      style={{ fontSize: "14px" ,minWidth: width?width:"100%", }}
      >
        {options.map((option, index) => {
          const value = typeof option === 'object' ? option.value : option;
          const displayValue = getDisplayValue(option);
          
          return (
            <Dropdown.Item 
              key={index} 
              onClick={() => onSelect(value)}
              style={{ fontSize: "14px" , color: getTextColor()}}
            >
              <div className="d-flex justify-content-between align-items-center w-100">
                <span>
                  {renderOption ? renderOption(option) : displayValue}
                </span>
                {selected === value && <FaCheck className="float-end" />}
              </div>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default CustomDropdown;