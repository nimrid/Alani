import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';

interface KickoffReminderProps {
  fixtureId: number;
  startTime: number;
  participant1: string;
  participant2: string;
  groupName: string;
}

export function KickoffReminder({ fixtureId, startTime, participant1, participant2, groupName }: KickoffReminderProps) {
  const [isSet, setIsSet] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`reminder_${fixtureId}`);
    if (stored === 'true') {
      setIsSet(true);
      scheduleNotification();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fixtureId, startTime]);

  const scheduleNotification = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const timeToNotify = (startTime - 15 * 60 * 1000) - Date.now();

    if (timeToNotify > 0) {
      timeoutRef.current = setTimeout(() => {
        // Double check local storage just in case it was toggled off but timeout wasn't cleared
        if (localStorage.getItem(`reminder_${fixtureId}`) === 'true') {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚽ Kickoff in 15 minutes', {
              body: `${participant1} vs ${participant2} · ${groupName} · Starting soon`,
              icon: '/alani-icon.png'
            });
          }
        }
      }, timeToNotify);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isSet) {
      setIsSet(false);
      localStorage.setItem(`reminder_${fixtureId}`, 'false');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (!('Notification' in window)) {
      alert('Notifications are not supported by this browser.');
      return;
    }

    let permission = Notification.permission;
    if (permission !== 'granted' && permission !== 'denied') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      setIsSet(true);
      localStorage.setItem(`reminder_${fixtureId}`, 'true');
      scheduleNotification();
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      className={`p-2 transition-colors flex items-center justify-center ${isSet ? 'text-chain-purple' : 'text-text-muted hover:text-chain-purple'}`}
      title={isSet ? "Remove reminder" : "Set reminder"}
    >
      <Bell size={16} fill={isSet ? 'currentColor' : 'none'} />
    </button>
  );
}
