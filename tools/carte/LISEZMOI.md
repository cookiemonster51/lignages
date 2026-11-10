# Carte : sous-régions

Fond : Natural Earth, admin-1 (domaine public), `ne_10m_admin_1_states_provinces.geojson`.
Projection de toute la carte : azimutale équivalente de Lambert, centre 6° E, 48° N, rayon 6371 km, unités en km, y vers le sud.
`build-sous-regions.py` regroupe des départements et provinces actuels, simplifie (mapshaper) et écrit `sub.json` ({R: tracés, C: centres}), recopié dans `index.html` (constante `MSUB`).
Les contours sont ceux de départements d'aujourd'hui : une approximation des provinces anciennes, pas leurs frontières.
