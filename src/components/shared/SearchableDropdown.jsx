import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * SearchableDropdown - Optimized searchable dropdown component
 * Integrated search input with dropdown for equipment selection
 *
 * @param {Array} options - Array of equipment options
 * @param {string} value - Selected equipment code
 * @param {Function} onChange - Callback when selection changes
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} disabled - Whether the dropdown is disabled
 */
const SearchableDropdown = React.memo(({
  options,
  value,
  onChange,
  placeholder = "Search equipment...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered options to avoid recalculation on every render
  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return options;
    }

    // More precise search: split search terms and require better matching
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);

    return options.filter(option => {
      const optionName = option.name.toLowerCase();
      const optionCode = option.code.toLowerCase();

      // Each search term must match as:
      // 1. Word boundary in name/code, OR
      // 2. Start of a word, OR
      // 3. Exact substring (but with priority to word boundaries)
      return searchTerms.every(term => {
        // Check in option name
        const nameWords = optionName.split(/[\s\-.]+/); // Split on space, dash, dot
        const codeWords = optionCode.split(/[\s\-.]+/);

        // Check if term matches start of any word or is contained
        const matchesName = nameWords.some(word => word.startsWith(term)) || optionName.includes(term);
        const matchesCode = codeWords.some(word => word.startsWith(term)) || optionCode.includes(term);

        return matchesName || matchesCode;
      });
    });
  }, [searchTerm, options]);

  // Memoize selected option lookup
  const selectedOption = useMemo(() =>
    options.find(opt => opt.code === value),
    [options, value]
  );

  // Auto-open dropdown when search term changes
  useEffect(() => {
    if (searchTerm) {
      setIsOpen(true);
    }
  }, [searchTerm]);

  // If we have a selection and no search term, show the selected name
  // If we have a search term, show that instead (user is actively searching)
  const displayValue = searchTerm !== '' ? searchTerm : (selectedOption ? selectedOption.name : '');

  // Memoized event handlers to prevent unnecessary re-renders
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    // Always keep dropdown open when user is actively typing/editing
    setIsOpen(true);
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Prevent dropdown from closing on backspace or any other key
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Keep dropdown open
      if (!isOpen) {
        setIsOpen(true);
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen]);

  const handleSelectOption = useCallback((optionCode) => {
    onChange(optionCode);
    setSearchTerm('');
    setIsOpen(false);
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      // If there's a selected option and no search term, set the search term to the selected name
      // This allows users to edit the selected text without losing the dropdown
      if (selectedOption && searchTerm === '') {
        setSearchTerm(selectedOption.name);
      }
    }
  }, [disabled, selectedOption, searchTerm]);

  const handleClickOutside = useCallback(() => {
    setIsOpen(false);
    // Simple logic: if user has a selection, show it; otherwise keep search term for continued editing
    if (selectedOption && searchTerm !== selectedOption.name) {
      setSearchTerm(''); // Show the selected item name
    }
    // Never clear the selection when clicking outside - let user continue searching
  }, [selectedOption, searchTerm]);

  const toggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  // Memoize category-filtered options
  const voidEquipment = useMemo(() =>
    filteredOptions.filter(eq => eq.category === 'void'),
    [filteredOptions]
  );

  const accessories = useMemo(() =>
    filteredOptions.filter(eq => eq.category === 'accessory'),
    [filteredOptions]
  );

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleClickOutside}
          placeholder={disabled ? 'Loading equipment...' : placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white"
        />
        <div
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
          onClick={toggleDropdown}
        >
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <>
                {/* Void Equipment */}
                {voidEquipment.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-50 sticky top-0">
                      Void Acoustics Equipment
                    </div>
                    {voidEquipment.map(option => (
                      <div
                        key={option.code}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100"
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                        onClick={() => handleSelectOption(option.code)}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-gray-500 text-xs">${option.msrpUSD || option.price} USD • {option.weight}kg</div>
                      </div>
                    ))}
                  </>
                )}

                {/* Accessories */}
                {accessories.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-50 sticky top-0">
                      Accessories
                    </div>
                    {accessories.map(option => (
                      <div
                        key={option.code}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100"
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                        onClick={() => handleSelectOption(option.code)}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-gray-500 text-xs">${option.msrpUSD || option.price} USD • {option.weight}kg</div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <div className="px-3 py-4 text-gray-500 text-sm text-center">No equipment found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SearchableDropdown.displayName = 'SearchableDropdown';

export default SearchableDropdown;
