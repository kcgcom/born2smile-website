"use client";

import { useEffect, useRef, useState } from "react";
import { CLINIC, MAP } from "@/lib/constants";

interface MapPoint {
  x: number;
  y: number;
}

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
          getProjection: () => {
            containerPointFromCoords: (latlng: unknown) => MapPoint;
            coordsFromContainerPoint: (point: MapPoint) => unknown;
          };
          getLevel: () => number;
          setLevel: (level: number, options: { anchor: unknown }) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Point: new (x: number, y: number) => MapPoint;
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        InfoWindow: new (options: {
          content: string;
          removable?: boolean;
          disableAutoPan?: boolean;
        }) => { open: (map: unknown, marker: unknown) => void };
        CustomOverlay: new (options: {
          map: unknown;
          position: unknown;
          content: HTMLElement;
          xAnchor: number;
          yAnchor: number;
        }) => unknown;
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
  zoomLevel?: number;
  markerOffsetY?: number;
  showZoomControl?: boolean;
  labelPlacement?: "above" | "right";
}

// Cloud Secret Manager에서 주입된 값에 공백/줄바꿈이 포함될 수 있으므로 trim 처리
const KAKAO_APP_KEY = (
  process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? ""
).trim();
const hasKey = !!KAKAO_APP_KEY;

export function KakaoMap({
  className = "",
  zoomLevel = MAP.zoomLevel,
  markerOffsetY = 0,
  showZoomControl = false,
  labelPlacement = "above",
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const zoomBy = useRef<((step: number) => void) | null>(null);
  const [error, setError] = useState(!hasKey);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasMarker, setHasMarker] = useState(false);

  useEffect(() => {
    if (!KAKAO_APP_KEY || error || !mapRef.current) return;

    // 이미 SDK가 로드되어 있으면 바로 초기화
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => initMap());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => initMap());
    };
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    function initMap() {
      try {
        const container = mapRef.current;
        if (!container) return;

        const { kakao } = window;
        const fallbackCoords = new kakao.maps.LatLng(MAP.lat, MAP.lng);

        const map = new kakao.maps.Map(container, {
          center: fallbackCoords,
          level: zoomLevel,
        });

        const infoContent = `<div style="padding:5px 10px;font-size:15px;font-weight:600;white-space:nowrap;">${CLINIC.name}</div>`;

        const createMarker = (position: unknown) => {
          map.setCenter(position);
          if (markerOffsetY) {
            const projection = map.getProjection();
            const point = projection.containerPointFromCoords(position);
            const center = new kakao.maps.Point(point.x, point.y - container.clientHeight * markerOffsetY);
            map.setCenter(projection.coordsFromContainerPoint(center));
          }

          const marker = new kakao.maps.Marker({ map, position });
          if (showZoomControl) {
            zoomBy.current = (step) => {
              map.setLevel(map.getLevel() + step, { anchor: position });
            };
            setHasMarker(true);
          }

          if (labelPlacement === "right") {
            const label = document.createElement("div");
            label.className =
              "ml-4 -translate-y-6 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-semibold whitespace-nowrap text-gray-900 shadow-sm";
            label.textContent = CLINIC.name;

            new kakao.maps.CustomOverlay({
              map,
              position,
              content: label,
              xAnchor: 0,
              yAnchor: 0.5,
            });
            return;
          }

          const infoWindow = new kakao.maps.InfoWindow({
            content: infoContent,
            disableAutoPan: markerOffsetY !== 0,
          });
          infoWindow.open(map, marker);
        };

        // 주소로 좌표 검색
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(CLINIC.address, (result, status) => {
          if (
            status === kakao.maps.services.Status.OK &&
            result.length > 0
          ) {
            const position = new kakao.maps.LatLng(
              parseFloat(result[0].y),
              parseFloat(result[0].x)
            );
            createMarker(position);
          } else {
            createMarker(fallbackCoords);
          }
        });
        setIsLoaded(true);
      } catch {
        queueMicrotask(() => setError(true));
      }
    }
  }, [error, labelPlacement, markerOffsetY, showZoomControl, zoomLevel]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 ${className}`}
      >
        <div className="text-center">
          <p className="text-sm text-gray-500">지도를 불러올 수 없습니다</p>
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(CLINIC.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-primary)] underline"
          >
            카카오맵에서 보기 <span className="sr-only">(새 창)</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      role={showZoomControl ? "group" : "img"}
      aria-label={`${CLINIC.name} 위치 지도 - ${CLINIC.address}`}
      className={`relative rounded-2xl border border-gray-200 ${className}`}
    >
      <div ref={mapRef} className="absolute inset-0 overflow-hidden rounded-[inherit]" />
      {showZoomControl && hasMarker && (
        <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col divide-y divide-gray-200 rounded-lg border border-gray-300 bg-white text-gray-900 shadow-sm">
          <button
            type="button"
            aria-label="지도 확대"
            className="size-11 rounded-t-lg text-xl hover:bg-gray-100"
            onClick={() => zoomBy.current?.(-1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="지도 축소"
            className="size-11 rounded-b-lg text-xl hover:bg-gray-100"
            onClick={() => zoomBy.current?.(1)}
          >
            −
          </button>
        </div>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
          <svg className="mb-2 size-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span className="text-sm">지도를 불러오는 중...</span>
        </div>
      )}
    </div>
  );
}
