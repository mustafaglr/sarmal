# Sarmal

Telefonda oynanan, Tabu tarzı parti oyunu: Anlat, Çiz, 15 Kelime, Pandomim. İçe doğru 3D sarmal bir harita, her takımın bir piyonu.
Kurallar oyunun içinde, "Nasıl oynanır?" düğmesinde.

**Hemen dene (tek telefon):** https://mustafaglr.github.io/sarmal/

## Çalıştırma

```bash
node server.js
```

Bağımlılık yok (Node 16+). Ekrana iki tür adres yazılır:

- `http://localhost:3030`: bu bilgisayardan açmak için.
- `http://192.168.x.x:3030`: aynı Wi-Fi'deki telefonlar için.

Biri oda kurar, diğerleri 4 harfli kodla katılır.

- **İnternetten oynamak:** `~/Desktop/PetekDiyari/yayin.sh` Petek Diyarı ile Sarmal'ı aynı ngrok adresinden yayınlar: `https://<alan>/catan/` ve `https://<alan>/sarmal/`. Sarmal'ı bu klasörden kendisi başlatır.
- **Kelimeler:** Sunucu açılırken internetteki 9 açık Türkçe tabu listesini çeker (yaklaşık 3.300 kart) ve `kelimeler.json` dosyasına kaydeder. Sonraki açılışlar internetsiz de çalışır.
  - Çiz ve Pandomim yalnızca somut kelimelerden seçer: hayvan, eşya, yemek, meslek, spor ve film kategorileri ile `public/somut.js` içindeki eylemler.
  - Hiçbir liste yoksa `public/yedek.js` içindeki 499 kartlık yedek liste (MIT) kullanılır.

## Yayındaki linki güncellemek

`public` klasörü `gh-pages` dalından yayınlanır. Değişiklikten sonra:

```bash
git subtree split --prefix public -b gh-pages && git push origin gh-pages
```

## Test

```bash
node test.js
```

## Dosyalar

- `public/game.js`: kurallar (tarayıcı ve sunucu ortak kullanır)
- `public/client.js`: ekranlar
- `public/board.js`: 3D sarmal harita, piyonlar, ekrandaki 3D ikonlar (three.js, `public/vendor`)
- `public/sound.js`: tik-tak ve seçilebilen süre sonu sesleri
- `public/words.js`, `public/somut.js`: kelime kaynakları
- `server.js`: odalar, canlı güncelleme, tur süresi
