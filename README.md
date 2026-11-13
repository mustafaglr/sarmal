# Sarmal

Telefonda oynanan, Tabu tarzı parti oyunu: Anlat, Çiz, 15 Kelime, Pandomim. İçe doğru sarmal bir harita, her takımın bir piyonu.
Kurallar oyunun içinde, "Nasıl oynanır?" düğmesinde.

**Hemen dene (tek telefon modu):** https://mustafaglr.github.io/sarmal/
Herkesin kendi telefonundan girdiği mod için aşağıdaki gibi sunucuyu bilgisayarda çalıştırmak gerekir.

## Çalıştırma

```bash
node server.js
```

Bağımlılık yok (Node 16+). Ekrana iki tür adres yazılır:

- `http://localhost:3030`: bu bilgisayardan açmak için.
- `http://192.168.x.x:3030`: aynı Wi-Fi'deki telefonlar için.

Biri oda kurar, diğerleri oda koduyla ya da lobide görünen bağlantıyla katılır. Başka bir port için: `node server.js 3001`.

- **Tek telefon:** Aynı adresten "Tek telefon" seçilir. Sunucu olmadan da çalışır: `public/index.html` dosyası tarayıcıda açılırsa yalnızca bu mod görünür.
- **Kelimeler:** Sunucu açılırken internetteki 4 açık Türkçe tabu listesini çeker (yaklaşık 2.770 kart) ve `kelimeler.json` dosyasına kaydeder. Sonraki açılışlarda internet olmasa da bu kayıt kullanılır. Hiçbiri yoksa `public/yedek.js` içindeki 499 kartlık yedek liste (MIT) devreye girer.
- **İnternetten oynamak:** Arkadaşlar aynı Wi-Fi'de değilse bir tünel açılır, ör. `ngrok http 3030`.

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
- `public/board.js`: sarmal harita ve piyon animasyonu
- `public/sound.js`: tik-tak ve süre sonu düdüğü
- `public/words.js`: kelime kaynakları
- `server.js`: odalar, canlı güncelleme, tur süresi
