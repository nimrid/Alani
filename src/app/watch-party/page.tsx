'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/alani/supabase';
import { WatchPartyForm } from '@/components/alani/WatchPartyForm';
import { MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Mock data for NY/NJ
const MOCK_PARTIES = [
  { id: '1', name: 'Legends Football Pub', latitude: 40.7484, longitude: -73.9857 },
  { id: '2', name: 'Brooklyn Watch Party', latitude: 40.6782, longitude: -73.9442 },
  { id: '3', name: 'Jersey City Fan Zone', latitude: 40.7282, longitude: -74.0776 },
  { id: '4', name: 'Hoboken Screen', latitude: 40.7439, longitude: -74.0324 },
];

export default function WatchPartyPage() {
  const [viewState, setViewState] = useState({
    longitude: -74.0060, // NY default
    latitude: 40.7128,
    zoom: 11
  });
  
  const [parties, setParties] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  useEffect(() => {
    // 1. Fetch parties from Supabase
    const fetchParties = async () => {
      try {
        const { data, error } = await supabase.from('watch_parties').select('*');
        if (error) throw error;
        // Only show mocks if no real data exists
        setParties(data && data.length > 0 ? data : MOCK_PARTIES);
      } catch (err) {
        console.warn('Could not fetch watch parties, falling back to mock data', err);
        // Supabase table might not exist yet, keeping MOCK_PARTIES
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
    // Geolocation is requested only when the user taps the prompt — see showLocationPrompt state
  }, []);

  const requestLocation = () => {
    setShowLocationPrompt(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setViewState(prev => ({
            ...prev,
            longitude,
            latitude,
            zoom: 12
          }));
        },
        (error) => {
          console.warn('Location permission denied or error:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  const handleRegisterSuccess = (newParty: any) => {
    setParties(prev => [...prev, newParty]);
    setShowForm(false);
  };

  const markers = useMemo(() => parties.map(party => (
    <Marker 
      key={party.id} 
      longitude={party.longitude} 
      latitude={party.latitude} 
      anchor="bottom"
    >
      <div className="flex flex-col items-center group cursor-pointer">
        <div className="bg-bg-elevated px-2 py-1 rounded shadow-lg text-xs font-bold whitespace-nowrap mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border-subtle">
          {party.name}
        </div>
        <MapPin size={32} className="text-chain-purple fill-bg-surface drop-shadow-md" />
      </div>
    </Marker>
  )), [parties]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-base text-text-base p-6 text-center">
        <MapPin size={48} className="text-chain-purple mb-4 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Mapbox Token Missing</h1>
        <p className="text-text-muted max-w-md">
          Please add your NEXT_PUBLIC_MAPBOX_TOKEN to the .env.local file to view the watch party map.
        </p>
        <Link href="/" className="mt-6 text-chain-purple hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] bg-bg-base overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-0 inset-x-0 z-10 p-4 bg-gradient-to-b from-bg-base/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link href="/" className="p-2 bg-bg-surface/80 backdrop-blur rounded-full hover:bg-bg-elevated transition-colors border border-border-subtle shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-lg" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Watch Parties Near Me</h1>
            <p className="text-xs text-text-muted">Find fans in your city</p>
          </div>
        </div>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={evt => setSelectedLocation({ lat: evt.lngLat.lat, lng: evt.lngLat.lng })}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        cursor="crosshair"
      >
        <GeolocateControl position="top-right" style={{ marginTop: '4rem', marginRight: '0.5rem' }} />
        <NavigationControl position="top-right" style={{ marginRight: '0.5rem' }} />
        
        {markers}
        
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500 border-2 border-white"></span>
            </div>
          </Marker>
        )}

        {selectedLocation && (
          <Marker longitude={selectedLocation.lng} latitude={selectedLocation.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-high-danger px-2 py-1 rounded shadow-lg text-xs font-bold text-white mb-1">
                Selected
              </div>
              <MapPin size={36} className="text-high-danger fill-bg-surface drop-shadow-md" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Location permission prompt */}
      {showLocationPrompt && !userLocation && (
        <div className="absolute top-20 inset-x-0 flex justify-center z-20 px-4">
          <div className="bg-bg-surface/95 backdrop-blur border border-border-subtle rounded-2xl p-4 shadow-xl flex items-start gap-3 max-w-sm w-full">
            <span className="text-xl shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary mb-0.5">Find parties near you</p>
              <p className="text-xs text-text-muted">Share your location to centre the map and discover watch parties in your area.</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={requestLocation}
                className="text-xs font-bold text-white bg-chain-purple px-3 py-1.5 rounded-lg hover:opacity-90 whitespace-nowrap"
              >
                Use my location
              </button>
              <button
                onClick={() => setShowLocationPrompt(false)}
                className="text-xs text-text-muted hover:text-text-primary text-center"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <WatchPartyForm 
          latitude={selectedLocation?.lat || userLocation?.lat || viewState.latitude}
          longitude={selectedLocation?.lng || userLocation?.lng || viewState.longitude}
          onClose={() => setShowForm(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  );
}
