import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, X, Loader } from 'lucide-react';

const MapPicker = ({ isOpen, onClose, onSelectAddress, initialAddress }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedAddress, setSelectedAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });
  
  // Default coordinates (India center)
  const defaultCoords = [20.5937, 78.9629];
  const [currentCoords, setCurrentCoords] = useState(defaultCoords);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Use window.L directly
    const L = window.L;
    if (!L) {
      console.error('Leaflet is not loaded on the window object.');
      return;
    }

    // Set up marker icon to avoid path resolution errors in React build
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Initialize Map instance
    const initialZoom = 5;
    mapRef.current = L.map(mapContainerRef.current).setView(currentCoords, initialZoom);

    // Load Tile Layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Initialize Marker
    markerRef.current = L.marker(currentCoords, { draggable: true }).addTo(mapRef.current);

    // Event listener for dragging the marker
    markerRef.current.on('dragend', () => {
      const position = markerRef.current.getLatLng();
      handleMarkerMove(position.lat, position.lng);
    });

    // Event listener for map clicking
    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current.setLatLng([lat, lng]);
      handleMarkerMove(lat, lng);
    });

    // Try geolocation on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [latitude, longitude];
          setCurrentCoords(userCoords);
          if (mapRef.current) {
            mapRef.current.setView(userCoords, 15);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng(userCoords);
          }
          handleMarkerMove(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          // If geocoding initial text exists, let's try to geocode it
          if (initialAddress) {
            const query = [initialAddress.line1, initialAddress.city, initialAddress.state, initialAddress.country]
              .filter(Boolean)
              .join(', ');
            if (query.trim()) {
              geocodeAddressString(query);
            }
          }
        }
      );
    } else if (initialAddress) {
      const query = [initialAddress.line1, initialAddress.city, initialAddress.state, initialAddress.country]
        .filter(Boolean)
        .join(', ');
      if (query.trim()) {
        geocodeAddressString(query);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  const handleMarkerMove = async (lat, lng) => {
    setGeocoding(true);
    setSearchError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      
      if (!response.ok) throw new Error('Geocoding service unavailable');
      
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        
        // Build address fields
        const line1 = [
          addr.building || addr.amenity || addr.house_number || '',
          addr.road || addr.street || addr.suburb || ''
        ]
          .filter(Boolean)
          .join(', ');

        const line2 = [
          addr.neighbourhood || addr.suburb || addr.quarter || ''
        ]
          .filter(Boolean)
          .join(', ');

        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';
        const country = addr.country || 'India';

        setSelectedAddress({
          line1: line1 || addr.suburb || addr.neighbourhood || 'Selected Location',
          line2: line2 || '',
          city,
          state,
          pincode,
          country,
          latitude: Number(lat),
          longitude: Number(lng)
        });
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setSearchError('Failed to get address for this location. You can still set it manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const geocodeAddressString = async (query) => {
    setSearching(true);
    setSearchError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (!response.ok) throw new Error('Search service unavailable');
      
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newCoords = [parseFloat(lat), parseFloat(lon)];
        setCurrentCoords(newCoords);
        
        if (mapRef.current) {
          mapRef.current.setView(newCoords, 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng(newCoords);
        }
        
        // Reverse geocode the coordinate to get a clean structured address
        handleMarkerMove(lat, lon);
      } else {
        setSearchError('Address not found. Please try a different query or locate manually.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    geocodeAddressString(searchQuery);
  };

  const locateUserCurrentPosition = () => {
    if (navigator.geolocation) {
      setGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [latitude, longitude];
          setCurrentCoords(userCoords);
          if (mapRef.current) {
            mapRef.current.setView(userCoords, 16);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng(userCoords);
          }
          handleMarkerMove(latitude, longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
          alert('Could not retrieve current location.');
          setGeocoding(false);
        }
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col h-[85vh] md:h-[75vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-stone-150">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Locate Clinic on Map</h3>
              <p className="text-xs text-stone-500">Search for a location, click on the map, or drag the pin to select the address.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-full hover:bg-stone-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 my-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter clinic address, landmark, town or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-black"
            />
            <Search className="absolute left-3.5 top-3.5 text-stone-400" size={16} />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={locateUserCurrentPosition}
            className="rounded-2xl border border-stone-300 p-3 hover:bg-stone-50 text-stone-700 transition"
            title="My Location"
          >
            <Navigation size={18} />
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rose-600 font-semibold mb-2">{searchError}</p>
        )}

        {/* Map Container */}
        <div className="flex-1 min-h-[200px] rounded-2xl overflow-hidden border border-stone-200 relative">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          {geocoding && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-stone-100 flex items-center gap-2">
                <Loader className="animate-spin text-emerald-600" size={16} />
                <span className="text-xs font-semibold text-stone-700">Resolving address details...</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Address Preview */}
        <div className="mt-4 bg-stone-50 rounded-2xl p-4 border border-stone-200/60">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block mb-1">Detected Address</span>
          <p className="text-sm text-stone-800 font-medium">
            {[selectedAddress.line1, selectedAddress.line2, selectedAddress.city, selectedAddress.state, selectedAddress.pincode, selectedAddress.country]
              .filter(Boolean)
              .join(', ') || 'No location selected yet'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-150 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectAddress(selectedAddress);
              onClose();
            }}
            disabled={geocoding || !selectedAddress.line1}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
          >
            Apply Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;
