import { useState, useEffect, useRef } from "react";
import { HiOutlineSearch, HiOutlineChevronDown } from "react-icons/hi";

export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select Option",
  searchPlaceholder = "Search...",
  disabled = false,
  isInactive = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter((opt) => {
    const name = typeof opt === "string" ? opt : opt.name || "";
    const label = typeof opt === "object" && opt.label ? opt.label : "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getOptionName = (opt) => {
    return typeof opt === "string" ? opt : opt.name || "";
  };

  const getOptionId = (opt) => {
    return typeof opt === "string" ? opt : opt.id || opt.name;
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-left text-sm text-text-primary flex items-center justify-between transition-all focus:outline-none focus:border-primary-light disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "border-primary-light shadow-[0_0_0_3px_rgba(20,184,166,0.1),_0_0_20px_rgba(20,184,166,0.05)]" : ""
        }`}
      >
        <span className={value ? "text-text-primary" : "text-text-muted/50"}>
          {value || placeholder}
        </span>
        <HiOutlineChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 glass-strong rounded-xl border border-border shadow-2xl p-2 flex flex-col max-h-64">
          {/* Search Box */}
          <div className="relative mb-2">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-dark border border-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm placeholder-text-muted/50 focus:outline-none focus:border-primary-light"
              onClick={(e) => e.stopPropagation()} // Stop propagation to prevent closing dropdown
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-44 pr-1 flex flex-col gap-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const optName = getOptionName(opt);
                const optId = getOptionId(opt);
                const isSelected = optName === value;

                return (
                  <button
                    key={optId}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                      isSelected
                        ? "bg-primary/20 text-primary-light font-semibold"
                        : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                    }`}
                    onClick={() => {
                      onChange(optName);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    {typeof opt === "object" && opt.label ? opt.label : optName}
                  </button>
                );
              })
            ) : (
              <div className="text-text-muted text-xs text-center py-3">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
