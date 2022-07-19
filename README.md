# Tiny app to generate an extra GIF

![GIF](/wan-party.gif "like this one")

Uses [svelte](https://svelte.dev), which is great.

Wouldn't be possible without:

- https://github.com/dnass/svelte-canvas
- https://github.com/d3/d3-geo
- https://github.com/beatgammit/tar-js

## usage:

Run the app with

```
git clone https://github.com/bkietz/wan-party-gif
cd wan-party-gif
npm install
npm run dev
```

Watch the animation and adjust parameters until it looks
the way you like, then click "extract frames". This will
ultimately generate a tarball of PNGs which you can aim
gifsicle or another gif authoring tool at:

```
tar -xf wan-party-gif-frames.tar
cd wan-party-gif-frames

# ImageMagick's convert can do this directly
convert -delay 2 -loop 0 *.png out.gif

# gifsicle might do better but requires conversion to gif first
for f in *.png
do echo $f && convert $f -quality 100 $f.gif
done

gifsicle \
  --merge \
  --delay=2 \
  --colors=256 \
  --optimize=3 \
  --loopcount=forever \
  --disposal=background \
  --output=wan-party.gif \
  frame_*.gif
```
