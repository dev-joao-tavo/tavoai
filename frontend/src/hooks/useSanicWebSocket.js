// hooks/useSanicWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';

export function useSanicWebSocket(url) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);

  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      // Filter out heartbeat messages
      if (message.type !== 'heartbeat') {
        setData(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log('Sanic WebSocket connected');
    };

    wsRef.current.onmessage = handleMessage;

    wsRef.current.onclose = () => {
      setIsConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectTimer.current = setTimeout(connect, delay);
      reconnectAttempts.current++;
    };

    wsRef.current.onerror = (error) => {
      console.error('Sanic WebSocket error:', error);
    };
  }, [url, handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { data, isConnected, send };
}

// components/RealTimeUserStatus.js
import { useSanicWebSocket } from '../hooks/useSanicWebSocket';
import { useEffect, useState } from 'react';

export function RealTimeUserStatus({ userId }) {
  const [user, setUser] = useState(null);
  const { data } = useSanicWebSocket('ws://localhost:8000/ws');

  useEffect(() => {
    // Initial load
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
  }, [userId]);

  useEffect(() => {
    if (data?.table === 'users' && data.record_id === userId) {
      if (data.operation === 'DELETE') {
        setUser(null);
      } else {
        // For updates, merge changed fields
        setUser(prev => ({
          ...prev,
          ...data.changed_fields,
          updatedAt: new Date().toISOString()
        }));
        
        // Or fetch fresh data if preferred
        // fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser);
      }
    }
  }, [data, userId]);

  if (!user) return <div>User not found</div>;

  return (
    <div className="user-status">
      <h3>{user.username}</h3>
      <p>Status: {user.driver_status || 'Unknown'}</p>
      <p>Last updated: {new Date(user.updatedAt || user.createdAt).toLocaleString()}</p>
    </div>
  );
}