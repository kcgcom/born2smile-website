"use client";

import { useEffect, useRef, useState } from "react";
import { CLINIC, MAP } from "@/lib/constants";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number }
        ) => {
          setCenter: (latlng: unknown) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        InfoWindow: new (options: {
          content: string;
          removable?: boolean;
        }) => { open: (map: unknown, marker: unknown) => void };
        services: {
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (
                result: { x: string; y: string }[],
                status: string
              ) => void
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

interface KakaoMapProps {
  className?: string;
}

// Cloud Secret Manager에서 주입된 값에 공백/줄바꿈이 포함될 수 있으므로 trim 처리
const KAKAO_APP_KEY = (
  process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? ""
).trim();
const hasKey = !!KAKAO_APP_KEY;

export function KakaoMap({ className = "" }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(!hasKey);

  // SDK 스크립트 로드
  useEffect(() => {
    if (!KAKAO_APP_KEY || loaded) return;

    // 이미 로드된 경우
    if (typeof window !== "undefined" && window.kakao?.maps) {
      window.kakao.maps.load(() => setLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setLoaded(true));
    };
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, [loaded]);

  // 지도 초기화
  useEffect(() => {
    if (!loaded || error || !mapRef.current) return;

    try {
      const { kakao } = window;
      const fallbackCoords = new kakao.maps.LatLng(MAP.lat, MAP.lng);

      const map = new kakao.maps.Map(mapRef.current, {
        center: fallbackCoords,
        level: MAP.zoomLevel,
      });

      const infoContent = `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap;">${CLINIC.name}</div>`;

      const createMarker = (position: unknown) => {
        const marker = new kakao.maps.Marker({ map, position });
        const infoWindow = new kakao.maps.InfoWindow({
          content: infoContent,
          removable: true,
        });
        infoWindow.open(map, marker);
      };

      // 주소 기반 좌표 검색
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(CLINIC.address, (result, status) => {
        if (
          status === kakao.maps.services.Status.OK &&
          result.length > 0
        ) {
          const coords = new kakao.maps.LatLng(
            parseFloat(result[0].y),
            parseFloat(result[0].x)
          );
          map.setCenter(coords);
          createMarker(coords);
        } else {
          createMarker(fallbackCoords);
        }
      });
    } catch {
      queueMicrotask(() => setError(true));
    }
  }, [loaded, error]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 ${className}`}
      >
        <div className="text-center">
          <p className="text-sm text-gray-400">지도를 불러올 수 없습니다</p>
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(CLINIC.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] underline"
          >
            카카오맵에서 보기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      role="img"
      aria-label={`${CLINIC.name} 위치 지도 - ${CLINIC.address}`}
      className={`rounded-2xl border border-gray-200 ${className}`}
    />
  );
}
