-- InnaOpcja.pl — seed: dopasowania alternatyw (45 = 15 zapytań x 3 sloty)
-- Zasady: zawsze 3 wypełnione sloty, zawsze inny producent niż model bazowy,
-- "tansza" = realnie niższa cena PLN, "wyzsza_jakosc" = wyższy tier specs/ceny,
-- "niszowa_marka" = mniej rozpoznawalna marka o podobnej jakości.

INSERT INTO product_alternatives (product_id, alternative_product_id, comparison_angle, reason) VALUES

((SELECT id FROM products WHERE slug = 'iphone-17'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'tansza', 'Podobny segment flagowy w niższej cenie startowej'),
((SELECT id FROM products WHERE slug = 'iphone-17'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Poczwórny aparat 200MP i większa bateria za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'iphone-17'), (SELECT id FROM products WHERE slug = 'google-pixel-10'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalna jakość aparatu i wsparcia'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), (SELECT id FROM products WHERE slug = 'oneplus-15r'), 'tansza', 'Flagowy chipset w niższej cenie segmentu sub-premium'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), (SELECT id FROM products WHERE slug = 'iphone-17-pro'), 'wyzsza_jakosc', 'Potrójny aparat i więcej RAM za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Niszowa marka, porównywalny flagowy chipset'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), (SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), 'tansza', 'Znacznie niższa cena przy wciąż mocnym chipsecie'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Jeszcze wyższej klasy aparat z podwójnym teleobiektywem'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Mniej znana marka, zbliżony poziom aparatu i chipsetu'),

((SELECT id FROM products WHERE slug = 'iphone-17-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'tansza', 'Wyraźnie niższa cena przy podobnej klasie flagowej'),
((SELECT id FROM products WHERE slug = 'iphone-17-pro'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Wyższa klasa aparatu i większa bateria'),
((SELECT id FROM products WHERE slug = 'iphone-17-pro'), (SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalna jakość zdjęć'),

((SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), (SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), 'tansza', 'Niższa cena przy tym samym aparacie 200MP'),
((SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), (SELECT id FROM products WHERE slug = 'oneplus-15'), 'wyzsza_jakosc', 'Prawdziwie flagowy chipset za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, podobny segment cenowy i jakościowy'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-a57-5g'), (SELECT id FROM products WHERE slug = 'poco-x8-pro'), 'tansza', 'Niższa cena przy mocniejszym chipsecie'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a57-5g'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'wyzsza_jakosc', 'Lepszy chipset, większa bateria i wyższej rozdzielczości aparat'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a57-5g'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, zbliżona klasa specyfikacji'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-a16'), (SELECT id FROM products WHERE slug = 'tcl-60r-5g'), 'tansza', 'Najtańsza opcja z 5G w zestawieniu'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a16'), (SELECT id FROM products WHERE slug = 'cmf-phone'), 'wyzsza_jakosc', 'Dwukrotnie więcej RAM w zbliżonej cenie'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a16'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86'), 'niszowa_marka', 'Mniej znana marka, lepsza bateria i aparat'),

((SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), (SELECT id FROM products WHERE slug = 'poco-x8-pro'), 'tansza', 'Znacznie niższa cena w tym samym koncernie Xiaomi'),
((SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'wyzsza_jakosc', 'Prawdziwie flagowy chipset Snapdragon 8 Elite Gen 5'),
((SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), (SELECT id FROM products WHERE slug = 'oneplus-15r'), 'niszowa_marka', 'Mniej znana marka, podobny wysoki poziom wydajności'),

((SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'tansza', 'Niższa cena przy porównywalnej klasie flagowej'),
((SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), 'wyzsza_jakosc', 'Poczwórny aparat 200MP i więcej pamięci RAM'),
((SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), (SELECT id FROM products WHERE slug = 'vivo-x300-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, aparat klasy flagowej'),

((SELECT id FROM products WHERE slug = 'iphone-17-pro-max'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'tansza', 'Wyraźnie niższa cena przy klasie flagowej'),
((SELECT id FROM products WHERE slug = 'iphone-17-pro-max'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Jeszcze wyższej klasy aparat z podwójnym teleobiektywem'),
((SELECT id FROM products WHERE slug = 'iphone-17-pro-max'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Mniej znana marka, porównywalny poziom aparatu i chipsetu'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-s25-ultra'), (SELECT id FROM products WHERE slug = 'oneplus-15r'), 'tansza', 'Niższa cena przy flagowym chipsecie'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s25-ultra'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Jeszcze wyższej klasy aparat, nowszy chipset'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-s25-ultra'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Mniej znana marka, zbliżony poziom aparatu'),

((SELECT id FROM products WHERE slug = 'poco-x8-pro'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86'), 'tansza', 'Niższa cena w podobnym segmencie średnim'),
((SELECT id FROM products WHERE slug = 'poco-x8-pro'), (SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), 'wyzsza_jakosc', 'Mocniejszy chipset klasy sub-flagowej'),
((SELECT id FROM products WHERE slug = 'poco-x8-pro'), (SELECT id FROM products WHERE slug = 'oneplus-15r'), 'niszowa_marka', 'Mniej znana marka, podobny poziom wydajności'),

((SELECT id FROM products WHERE slug = 'motorola-moto-g86-power'), (SELECT id FROM products WHERE slug = 'cmf-phone'), 'tansza', 'Niższa cena w segmencie budżetowym'),
((SELECT id FROM products WHERE slug = 'motorola-moto-g86-power'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-a57-5g'), 'wyzsza_jakosc', 'Lepszy ekran AMOLED i wsparcie marki Samsung'),
((SELECT id FROM products WHERE slug = 'motorola-moto-g86-power'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, wyższa klasa aparatu'),

((SELECT id FROM products WHERE slug = 'iphone-15'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-a56-5g'), 'tansza', 'Wyraźnie niższa cena przy podobnym segmencie'),
((SELECT id FROM products WHERE slug = 'iphone-15'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'wyzsza_jakosc', 'Nowocześniejszy aparat i znacznie większa bateria'),
((SELECT id FROM products WHERE slug = 'iphone-15'), (SELECT id FROM products WHERE slug = 'google-pixel-10'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalna jakość zdjęć'),

((SELECT id FROM products WHERE slug = 'samsung-galaxy-a56-5g'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86'), 'tansza', 'Niższa cena w podobnym segmencie średnim'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a56-5g'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'wyzsza_jakosc', 'Lepszy chipset i znacznie większa bateria'),
((SELECT id FROM products WHERE slug = 'samsung-galaxy-a56-5g'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, zbliżony segment cenowy');
