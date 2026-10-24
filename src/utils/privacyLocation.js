// 정확한 위치(집 주소 수준)가 다른 사용자에게 노출되지 않도록, 저장 전에 격자(약 1km)로 뭉갠다.
// 소수점 둘째 자리 = 위도 약 1.1km / 경도 약 0.9km. 거리 표시·필터에는 충분하고, 정확한 위치는 알 수 없다.
export const roundCoord = (v) => Math.round(v * 100) / 100;

export const blurLocation = (lat, lng) => ({ lat: roundCoord(lat), lng: roundCoord(lng) });
