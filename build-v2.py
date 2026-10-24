#!/usr/bin/env python3
"""
Build CSM Hub V2 Preview.

V2 = the REAL production hub (index.html + entra-auth.js, unmodified)
   + the redesign layer
   + the V2 write policy and diagnostics

It is NOT built from the local standalone preview. The harness, the mock
dataset, the fake identity, the fetch interception, the role switcher and the
LOCAL PREVIEW bar are development-only and are asserted absent below.

Output: v2/index.html — a sibling of V1, sharing nothing but the origin.
"""
import hashlib
import re
import io, os, re, shutil, sys

HUB = os.path.expanduser('~/tribute-csm-hub')
RD  = os.path.expanduser('~/tribute-csm-hub-redesign')
OUT = os.path.dirname(os.path.abspath(__file__))

# The redesign layer, in load order. mockdata.js, harness.js and
# regression.js are DELIBERATELY ABSENT:
#   mockdata/harness — synthetic data, fake auth, simulated writes
#   regression       — several suites mutate shared state to build fixtures,
#                      which is needless risk against a live document
LAYER = ['brand.js', 'icons.js', 'bridge.js', 'redesign.js', 'workflows.js', 'router.js']
BANNED = ['mockdata.js', 'harness.js', 'regression.js']

def read(p):
    with io.open(p, encoding='utf-8') as f: return f.read()

def main():
    html = read(os.path.join(HUB, 'index.html'))
    assert 'entra-auth.js' in html, 'production index.html lost its auth script'

    # 1. Title and the tab's own identity, so a pilot tab is never mistaken
    #    for the live hub in a crowded window.
    html = html.replace('<title>Tribute CSM Hub</title>',
                        '<title>Tribute CSM Hub · V2 Preview</title>', 1)
    if 'V2 Preview</title>' not in html:
        html = re.sub(r'<title>([^<]*)</title>',
                      lambda m: '<title>' + m.group(1).strip() + ' · V2 Preview</title>',
                      html, count=1)

    # 2. entra-auth.js lives one level up. Its redirect URI is derived from
    #    location.pathname, so serving at /v2/ asks Entra for /v2/ — which is
    #    why /v2/ needs its own registered SPA redirect URI.
    html = html.replace('src="./entra-auth.js', 'src="../entra-auth.js')
    # tribute-usage.js POSTs active-time telemetry. A read-only preview must
    # not write usage rows, and it must not pollute real usage statistics
    # with pilot activity. Found live: the fetch tripwire caught it as an
    # ungated write path (endpoint=usage_time) because the audit covered
    # index.html and not this companion script. V2 simply does not load it.
    import re as _re
    html = _re.sub(r'\s*<script src="\./tribute-usage\.js[^"]*"></script>', '', html)
    assert not _re.search(r'<script[^>]*tribute-usage', html), 'usage telemetry still loaded'

    # 2b. (removed) V2 used to patch the 409 retry so it would not overwrite
    #     another interface's DATA.shared. V1's retry is now a three-way merge
    #     at record level (TD-30), which is strictly better than what the
    #     patch did, and applies to both interfaces. Keeping a V2-only variant
    #     would mean two different merge semantics against one document.

    # 3. The redesign layer + the V2 policy, before </body>.
    #    ORDER MATTERS: bridge.js assigns window.TributeApp, so v2-policy.js
    #    must come after it or the capability surface is overwritten.
    #    Every asset is stamped with a hash of its own contents. Without it
    #    the browser keeps a cached icons.js next to a fresh index.html and
    #    the page silently runs last week's code — which is exactly what
    #    happened to the market-illustration colour pass: Pages was serving
    #    the new file and Chrome was ignoring it.
    def stamp(name):
        src = os.path.join(OUT, 'v2', name)
        h = hashlib.sha1(io.open(src, 'rb').read()).hexdigest()[:8]
        return './%s?v=%s' % (name, h)

    # Copy the layer across FIRST, so the stamps are taken from what ships.
    for f in LAYER + ['redesign.css']:
        shutil.copyfile(os.path.join(RD, 'prototype', f), os.path.join(OUT, 'v2', f))

    tags = []
    tags.append('<link rel="stylesheet" href="%s">' % stamp('redesign.css'))
    tags.append('<link rel="stylesheet" href="%s">' % stamp('v2.css'))
    for f in LAYER:
        tags.append('<script src="%s"></script>' % stamp(f))
    tags.append('<script src="%s"></script>' % stamp('v2-policy.js'))
    tags.append('<script src="%s"></script>' % stamp('v2-chrome.js'))
    tags.append('<script src="%s"></script>' % stamp('v2-feedback.js'))
    tags.append('<script src="%s"></script>' % stamp('v2-help.js'))
    block = '\n' + '\n'.join(tags) + '\n'
    # There are two '</body>' in the file: one inside a printable-HTML string
    # the LTC packet builds, and the real one at the end. Anchor on the LAST.
    i = html.rindex('</body>')
    html = html[:i] + block + html[i:]

    with io.open(os.path.join(OUT, 'v2', 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    # 4. (the layer was copied above, before the stamps were taken)

    # 4b. The guide is a hand-written page, but its two assets are not: a
    #     cached guide-content.js beside a fresh guide.html shows the old
    #     wording and puts callout dots on the wrong part of a screenshot.
    #     Same content-hash treatment as everything else.
    gpath = os.path.join(OUT, 'v2', 'guide.html')
    if os.path.exists(gpath):
        g = read(gpath)
        for asset in ('guide-content.js', 'guide.css'):
            h = hashlib.sha1(io.open(os.path.join(OUT, 'v2', asset), 'rb').read()).hexdigest()[:8]
            g = re.sub(r'\./' + re.escape(asset) + r'(\?v=[0-9a-f]+)?',
                       './' + asset + '?v=' + h, g)
        with io.open(gpath, 'w', encoding='utf-8') as f:
            f.write(g)

    # 5. Assertions. A harness that reaches production is the one thing that
    #    must never happen, so it is checked rather than assumed.
    out = read(os.path.join(OUT, 'v2', 'index.html'))
    # v2-feedback.js was once added to index.html by hand; the next build
    # regenerated the page without it and the pilot's Feedback button was
    # dead for two hours before a screenshot caught it. Assert every V2
    # script is actually referenced, so a rebuild can never drop one again.
    for _req in ('v2-policy.js', 'v2-chrome.js', 'v2-feedback.js', 'v2-help.js'):
        assert _req in out, 'built index.html does not load %s' % _req
    present = sorted(os.listdir(os.path.join(OUT, 'v2')))
    problems = []
    for b in BANNED:
        if b in out: problems.append('index.html references %s' % b)
        if b in present: problems.append('%s was copied into v2/' % b)
    for needle, why in [
        ('__PROTO_MOCK', 'mock dataset'),
        ('LOCAL PREVIEW', 'development bar'),
        ('proto-acct', 'role switcher'),
    ]:
        for f in present:
            if not f.endswith(('.js', '.html')): continue
            body = read(os.path.join(OUT, 'v2', f))
            if needle in body and f != 'build-v2.py':
                problems.append('%s contains %s (%s)' % (f, needle, why))
    if 'entra-auth.js' not in out: problems.append('V2 lost the real auth script')
    if 'msal-browser' not in out: problems.append('V2 lost MSAL')

    print('v2/index.html written (%d KB)' % (len(out) // 1024))
    print('layer:', ', '.join(LAYER))
    print('excluded:', ', '.join(BANNED))
    if problems:
        print('\nFAILED:')
        for p in problems: print('  -', p)
        sys.exit(1)
    print('assertions: real auth present, no harness, no mock data, no role switcher — OK')

main()
