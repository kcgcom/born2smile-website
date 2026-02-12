"use client";

import { useEffect, useRef, useState } from "react";
import { CLINIC, MAP } from "@/lib/constants";

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (
          container: HTMLElement,
          options: {
            center: unknown;
            zoom: number;
            zoomControl?: boolean;
            zoomControlOptions?: { position: unknown };
          }
        ) => { setCenter: (latlng: unknown) => void };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        InfoWindow: new (options: {
          content: string;
          borderWidth?: number;
          borderColor?: string;
          backgroundColor?: string;
          anchorSize?: unknown;
          anchorSkew?: boolean;
        }) => { open: (map: unknown, marker: unknown) => void };
        Size: new (width: number, height: number) => unknown;
        Position: { TOP_RIGHT: unknown };
        Service: {
          geocode: (
            options: { query: string },
            callback: (status: number, response: NaverGeocodeResponse) => void
          ) => void;
          Status: { OK: number };
        };
        Event: {
          once: (target: unknown, event: string, callback: () => void) => void;
        };
      };
    };
  }
}

interface NaverGeocodeResponse {
  v2: {
    addresses: { x: string; y: string }[];
  };
}

interface NaverMapProps {
  className?: string;
}

const hasKey = !!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

export function NaverMap({ className = "" }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(
    () => hasKey && typeof window !== "undefined" && !!window.naver?.maps
  );
  const [error, setError] = useState(!hasKey);

  // SDK 스크립트 로드
  useEffect(() => {
    if (!hasKey || loaded) return;

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    return () => {
      // 다른 인스턴스가 사용 중일 수 있으므로 스크립트 제거 안 함
    };
  }, [loaded]);

  // 지도 초기화 + 인증 실패 감지
  useEffect(() => {
    if (!loaded || error || !mapRef.current) return;

    const container = mapRef.current;

    // Naver Maps SDK 인증 실패 시 에러 오버레이를 감지하여 fallback UI 표시
    const observer = new MutationObserver(() => {
      if (container.textContent?.includes("인증이 실패")) {
        setError(true);
        observer.disconnect();
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    try {
      const { naver } = window;
      const fallbackCoords = new naver.maps.LatLng(MAP.lat, MAP.lng);

      const map = new naver.maps.Map(container, {
        center: fallbackCoords,
        zoom: MAP.zoomLevel,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
      });

      const infoContent = `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap;">${CLINIC.name}</div>`;

      const createMarker = (position: unknown) => {
        const marker = new naver.maps.Marker({ map, position });
        const infoWindow = new naver.maps.InfoWindow({
          content: infoContent,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#fff",
          anchorSize: new naver.maps.Size(10, 10),
          anchorSkew: true,
        });
        infoWindow.open(map, marker);
      };

      // Geocoder submodule 로드 완료 후 주소 검색
      if (naver.maps.Service) {
        naver.maps.Service.geocode(
          { query: CLINIC.address },
          (status, response) => {
            if (
              status === naver.maps.Service.Status.OK &&
              response.v2.addresses.length > 0
            ) {
              const addr = response.v2.addresses[0];
              const position = new naver.maps.LatLng(
                parseFloat(addr.y),
                parseFloat(addr.x)
              );
              map.setCenter(position);
              createMarker(position);
            } else {
              createMarker(fallbackCoords);
            }
          }
        );
      } else {
        // Service 모듈 미로드 시 fallback 좌표 사용
        createMarker(fallbackCoords);
      }
    } catch {
      queueMicrotask(() => setError(true));
      observer.disconnect();
    }

    return () => observer.disconnect();
  }, [loaded, error]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 ${className}`}
      >
        <div className="text-center">
          <p className="text-sm text-gray-400">지도를 불러올 수 없습니다</p>
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(CLINIC.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] underline"
          >
            네이버 지도에서 보기
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
