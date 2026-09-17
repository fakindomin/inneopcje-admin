-- InnaOpcja.pl — seed: dopasowania alternatyw dla pozostalych 11 telefonow z puli
-- (dotad mialy tylko przychodzace linki jako alternatywy, teraz kazdy telefon
-- w calej siatce 26 modeli jest klikalny i ma wlasne 3 sloty wychodzace).
--
-- Dwa przypadki brzegowe (vivo X300 Ultra = najdrozszy/najmocniejszy model w puli,
-- TCL 60R 5G = najtanszy) nie maja uczciwego kandydata scisle "wyzej"/"nizej" -
-- zgodnie z zasada "innaopcja" slot mimo to jest wypelniony, ale reason mowi
-- wprost o tym ograniczeniu zamiast udawac falszywa hierarchie.

INSERT INTO product_alternatives (product_id, alternative_product_id, comparison_angle, reason) VALUES

((SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'tansza', 'Wyraźnie niższa cena przy wciąż flagowym poziomie'),
((SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), 'wyzsza_jakosc', 'Równie topowy segment z innymi mocnymi stronami (rysik S Pen) — to już szczyt zestawienia, więc traktuj to jako inną opcję, nie obiektywnie wyższą'),
((SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), (SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalny poziom flagowy'),

((SELECT id FROM products WHERE slug = 'google-pixel-10'), (SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), 'tansza', 'Niższa cena przy mocnym chipsecie sub-flagowym'),
((SELECT id FROM products WHERE slug = 'google-pixel-10'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), 'wyzsza_jakosc', 'Poczwórny aparat 200MP i wyższa klasa specyfikacji'),
((SELECT id FROM products WHERE slug = 'google-pixel-10'), (SELECT id FROM products WHERE slug = 'oneplus-15'), 'niszowa_marka', 'Mniej znana marka, porównywalny poziom flagowy'),

((SELECT id FROM products WHERE slug = 'oneplus-15r'), (SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), 'tansza', 'Niższa cena w podobnym segmencie średnim'),
((SELECT id FROM products WHERE slug = 'oneplus-15r'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'wyzsza_jakosc', 'Prawdziwie flagowy chipset za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'oneplus-15r'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'niszowa_marka', 'Mniej znana marka, zbliżony segment cenowy i jakościowy'),

((SELECT id FROM products WHERE slug = 'honor-magic8-pro'), (SELECT id FROM products WHERE slug = 'oneplus-15'), 'tansza', 'Niższa cena przy wciąż flagowym chipsecie'),
((SELECT id FROM products WHERE slug = 'honor-magic8-pro'), (SELECT id FROM products WHERE slug = 'vivo-x300-ultra'), 'wyzsza_jakosc', 'Jeszcze wyższej klasy aparat z podwójnym teleobiektywem'),
((SELECT id FROM products WHERE slug = 'honor-magic8-pro'), (SELECT id FROM products WHERE slug = 'google-pixel-10-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalny poziom flagowy'),

((SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86-power'), 'tansza', 'Niższa cena w podobnym segmencie budżetowo-średnim'),
((SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'wyzsza_jakosc', 'Lepszy chipset i wyższa cena o klasę wyżej'),
((SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, zbliżony segment cenowy'),

((SELECT id FROM products WHERE slug = 'oneplus-15'), (SELECT id FROM products WHERE slug = 'xiaomi-17t-pro'), 'tansza', 'Niższa cena przy mocnym chipsecie sub-flagowym'),
((SELECT id FROM products WHERE slug = 'oneplus-15'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), 'wyzsza_jakosc', 'Poczwórny aparat 200MP i wyższa klasa specyfikacji'),
((SELECT id FROM products WHERE slug = 'oneplus-15'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalny poziom flagowy'),

((SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86'), 'tansza', 'Niższa cena w podobnym segmencie budżetowym'),
((SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), (SELECT id FROM products WHERE slug = 'realme-16-pro-plus'), 'wyzsza_jakosc', 'Lepszy chipset, większa bateria i wyższej klasy aparat'),
((SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), (SELECT id FROM products WHERE slug = 'redmi-note-15-pro-plus'), 'niszowa_marka', 'Mniej znana marka, zbliżony segment cenowy'),

((SELECT id FROM products WHERE slug = 'tcl-60r-5g'), (SELECT id FROM products WHERE slug = 'cmf-phone'), 'tansza', 'Najbliższa cenowo opcja w zestawieniu, inna marka — to już dół rankingu cenowego, więc traktuj to jako inną opcję, nie obiektywnie tańszą'),
((SELECT id FROM products WHERE slug = 'tcl-60r-5g'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86'), 'wyzsza_jakosc', 'Lepszy chipset i większa bateria za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'tcl-60r-5g'), (SELECT id FROM products WHERE slug = 'poco-x8-pro'), 'niszowa_marka', 'Mniej znana marka, znacznie wyższy segment — warta rozważenia opcja'),

((SELECT id FROM products WHERE slug = 'cmf-phone'), (SELECT id FROM products WHERE slug = 'tcl-60r-5g'), 'tansza', 'Niższa cena, także z obsługą 5G'),
((SELECT id FROM products WHERE slug = 'cmf-phone'), (SELECT id FROM products WHERE slug = 'motorola-moto-g86-power'), 'wyzsza_jakosc', 'Większa bateria i więcej RAM za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'cmf-phone'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, wyższy segment aparatu'),

((SELECT id FROM products WHERE slug = 'motorola-moto-g86'), (SELECT id FROM products WHERE slug = 'tcl-60r-5g'), 'tansza', 'Znacznie niższa cena, podstawowe 5G'),
((SELECT id FROM products WHERE slug = 'motorola-moto-g86'), (SELECT id FROM products WHERE slug = 'poco-x8-pro'), 'wyzsza_jakosc', 'Mocniejszy chipset i większa bateria za wyższą cenę'),
((SELECT id FROM products WHERE slug = 'motorola-moto-g86'), (SELECT id FROM products WHERE slug = 'nothing-phone-4a-pro'), 'niszowa_marka', 'Mniej znana marka, wyższy segment aparatu'),

((SELECT id FROM products WHERE slug = 'vivo-x300-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26'), 'tansza', 'Niższa cena przy wciąż flagowym chipsecie'),
((SELECT id FROM products WHERE slug = 'vivo-x300-pro'), (SELECT id FROM products WHERE slug = 'samsung-galaxy-s26-ultra'), 'wyzsza_jakosc', 'Poczwórny aparat 200MP i wyższa klasa specyfikacji'),
((SELECT id FROM products WHERE slug = 'vivo-x300-pro'), (SELECT id FROM products WHERE slug = 'honor-magic8-pro'), 'niszowa_marka', 'Mniej znana w Polsce marka, porównywalny poziom flagowy');
