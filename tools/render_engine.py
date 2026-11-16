"""Compatibility adapter for the current tests/render_weather.py EGL engine.

Load its setup/functions through the AST, stopping before its executable QA suite.
This keeps one production render implementation, without textual prefix slicing or
requiring old analysis fixtures. No browser, UI, audio or phone claim is implied.
"""
from pathlib import Path
import ast, json, subprocess, sys, tempfile
ROOT = Path(__file__).resolve().parents[1]

def load_engine():
    script = ROOT / 'tests/render_weather.py'
    tree = ast.parse(script.read_text(), filename=str(script))
    nodes = []
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'frames' for t in node.targets):
            break
        nodes.append(node)
    else:
        raise RuntimeError('render_weather engine boundary changed: expected frames assignment')
    code = """
const M=require('./dist/motion.js'),F=require('./dist/fishing.js'),C=require('./dist/clouds.js'),B=require('./dist/birds.js'),L=require('./dist/lightning.js');
const s=M.create();s.fishing=F.create();
console.log(JSON.stringify({boat:[s.boat.x,s.boat.y,0,1],fish:Array.from(M.packed(s)),tackle:[360,234,4,2],fishingInfo:[0,.5,0,1],cloud:Array.from(C.geometry()),birds:Array.from(B.packed(B.create())),lightning:Array.from(L.geometry(270,1)),frames:[]}));
"""
    state = subprocess.check_output(['node', '-e', code], cwd=ROOT)
    namespace = {'__file__': str(script), '__name__': 'weather_render_engine'}
    old_argv = sys.argv
    with tempfile.TemporaryDirectory(prefix='coast-render-') as tmp:
        fixture = Path(tmp) / 'state.json'; fixture.write_bytes(state)
        try:
            sys.argv = [str(script), str(fixture), tmp]
            exec(compile(ast.Module(body=nodes, type_ignores=[]), str(script), 'exec'), namespace)
        finally:
            sys.argv = old_argv
    return namespace
