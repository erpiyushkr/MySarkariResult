# Google AdSense Placement Guide

To comply with AdSense policy while maintaining great user experience, we have provided placeholder blocks with the class `.ad-slot` inside the HTML templates.

When you are approved by AdSense, you can inject the `<ins>` tags directly into these placeholders. 

## Locations of Ad Slots in Templates
1. **Below the Breadcrumb / Top of Main Content**: Great for visibility without shifting layout.
2. **In-between Content sections / Bottom of Main Content**: High interaction rate without being disruptive.

## Example Integration
Currently, your `template.html` files look like this:
```html
<div class="ad-slot hide-print" aria-hidden="true">
    <!-- AdSense Placeholder: Top Ad -->
    Advertisement Placeholder
</div>
```

**Once approved, replace the plain text inside the `div` with your provided Google AdSense Script:**
```html
<div class="ad-slot hide-print" aria-hidden="true">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="1234567890"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({});
    </script>
</div>
```

### Important CSS Note
The `.ad-slot` CSS sets a `min-height: 90px` (or `250px` on desktop) inside `base.css`. This prevents **Cumulative Layout Shift (CLS)**—a negative SEO signal—when ads load dynamically. You do not need to remove the `.ad-slot` container; simply nest your script inside it.
