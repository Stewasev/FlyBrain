# Blender twin

Same runtime pack as the web atlas. Needs [Blender](https://www.blender.org/) 4.x or 5.x on PATH (Steam install is fine).

```
blender --background --python blender/import_atlas.py -- --stain dimorphism --save blender/MaleCNS.blend --render blender/dimorphism.png
```

`--stain superclass` uses region colors instead of sexual dimorphism.

The `.blend` is gitignored if it is huge; the still `dimorphism.png` is the shareable plate.
