# text_ext2_pwa 디자인 업데이트

현재 `text_ext2_pwa`의 기능 로직은 변경하지 않고 UI만 `pb_sort`와 통일감 있게 정리한 업데이트입니다.

## 교체할 파일
- `index.html`
- `style.css`
- `manifest.json`

`app.js`, `sw.js`, `icon.png`는 기존 파일을 그대로 유지합니다.

## 디자인 방향
- iPhone 기본 유틸리티에 가까운 가벼운 화면
- 밝은 배경 + 흰색 카드
- 메인 블루와 완료 그린만 포인트 컬러로 사용
- 외부 폰트/아이콘/라이브러리 없음
- 원문과 결과는 기존 textarea를 유지하여 직접 붙여넣기 기능을 보존
