import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { FaCheck, FaAngleDown } from "react-icons/fa";

function CustomDropdown({ label, options, selected, onSelect, renderOption, renderSelected ,width}) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayValue = (option) => {
    if (typeof option === 'object') return option?.label || option?.value;
    return option;
  };
  return (
    <Dropdown className="pnut-dropdown" onToggle={(isOpen) => setIsOpen(isOpen)}>
      <Dropdown.Toggle
        variant="light"
        id="custom-dropdown"
        className="pnut-dropdown__toggle"
        style={{
          minWidth: width,
        }}
      >
        <span className="pnut-dropdown__label">{label}</span>
        <span className="pnut-dropdown__value">
          {renderSelected ? renderSelected(selected) : getDisplayValue(options.find(opt => 
            (typeof opt === 'object' ? opt.value : opt) === selected) || selected
          )}
        </span>
        <FaAngleDown
          className={`ms-1 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </Dropdown.Toggle>

      <Dropdown.Menu
        className="pnut-dropdown__menu"
        style={{ minWidth: width ? width : "100%" }}
      >
        {options.map((option, index) => {
          const value = typeof option === 'object' ? option.value : option;
          const displayValue = getDisplayValue(option);
          
          return (
            <Dropdown.Item 
              key={index} 
              onClick={() => onSelect(value)}
              className="pnut-dropdown__item"
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
