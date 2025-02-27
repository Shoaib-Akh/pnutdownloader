import React, { useState, useEffect } from "react";
import { Dropdown, DropdownButton } from "react-bootstrap";
import { FaCheck, FaAngleDown } from "react-icons/fa";

function CustomDropdown({ label, options, defaultSelected, onSelect }) {
  const [selected, setSelected] = useState(defaultSelected);
  const [isOpen, setIsOpen] = useState(false);

  // Update parent component when selected value changes
  useEffect(() => {
    onSelect(selected);
  }, [selected, onSelect]);

  return (
    <DropdownButton
      id="custom-dropdown"
      title={
        <>
          <span style={{ color: "#A1A1A1" }}>{label}</span> {selected}
          <FaAngleDown
            className={`ms-1 transition ${isOpen ? "rotate-180" : ""}`}
          />
        </>
      }
      variant="light"
      className="border-0"
      onToggle={(isOpen) => setIsOpen(isOpen)}
    >
      {options.map((option, index) => (
        <Dropdown.Item key={index} onClick={() => setSelected(option)}>
          {option} {selected === option && <FaCheck className="float-end" />}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
}

export default CustomDropdown;
