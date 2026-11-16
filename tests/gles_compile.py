"""Compile the unmodified GLSL ES 1.00 programs in a local EGL/GLES context."""
import ctypes as C,ctypes.util,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'dist/shaders'
egl=C.CDLL(ctypes.util.find_library('EGL'));gl=C.CDLL(ctypes.util.find_library('GLESv2'))
def bind(lib,name,restype,args):
 try:f=getattr(lib,name)
 except AttributeError:
  egl.eglGetProcAddress.restype=C.c_void_p;egl.eglGetProcAddress.argtypes=[C.c_char_p]
  address=egl.eglGetProcAddress(name.encode());assert address,name;f=C.CFUNCTYPE(restype,*args)(address)
 f.restype=restype;f.argtypes=args;return f
ptr=C.c_void_p;I=C.c_int;U=C.c_uint
get=bind(egl,'eglGetPlatformDisplay',ptr,[U,ptr,C.POINTER(I)]);display=get(0x31DD,None,None)
assert bind(egl,'eglInitialize',U,[ptr,C.POINTER(I),C.POINTER(I)])(display,None,None)
assert bind(egl,'eglBindAPI',U,[U])(0x30A0)
attrs=(I*13)(0x3024,8,0x3023,8,0x3022,8,0x3033,1,0x3040,4,0x3021,8,0x3038);config=ptr();count=I()
assert bind(egl,'eglChooseConfig',U,[ptr,C.POINTER(I),C.POINTER(ptr),I,C.POINTER(I)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface=bind(egl,'eglCreatePbufferSurface',ptr,[ptr,ptr,C.POINTER(I)])(display,config,(I*5)(0x3057,16,0x3056,16,0x3038))
ctx=bind(egl,'eglCreateContext',ptr,[ptr,ptr,ptr,C.POINTER(I)])(display,config,None,(I*3)(0x3098,2,0x3038))
assert bind(egl,'eglMakeCurrent',U,[ptr,ptr,ptr,ptr])(display,surface,surface,ctx)
getint=bind(gl,'glGetIntegerv',None,[U,C.POINTER(I)]);limit=I();getint(0x8DFD,C.byref(limit))
create_shader=bind(gl,'glCreateShader',U,[U]);shader_source=bind(gl,'glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compile_shader=bind(gl,'glCompileShader',None,[U]);getshader=bind(gl,'glGetShaderiv',None,[U,U,C.POINTER(I)]);shader_log=bind(gl,'glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
def shader(kind,text):
 s=create_shader(kind);data=C.c_char_p(text.encode());shader_source(s,1,C.byref(data),None);compile_shader(s);ok=I();getshader(s,0x8B81,C.byref(ok))
 log=C.create_string_buffer(16384);shader_log(s,len(log),None,log);assert ok.value,log.value.decode();return s
create_program=bind(gl,'glCreateProgram',U,[]);attach=bind(gl,'glAttachShader',None,[U,U]);link=bind(gl,'glLinkProgram',None,[U]);getprogram=bind(gl,'glGetProgramiv',None,[U,U,C.POINTER(I)]);program_log=bind(gl,'glGetProgramInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
common=(root/'common.glsl').read_text();quad='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}'
for name,v,f in [('environment',quad,common+(root/'birds.glsl').read_text()+(root/'environment.frag').read_text()),('clouds',common+(root/'clouds.vert').read_text(),common+(root/'clouds.frag').read_text()),('water',common+(root/'particles.vert').read_text(),(root/'particles.frag').read_text()),('precipitation',quad,common+(root/'precipitation.frag').read_text())]:
 p=create_program();attach(p,shader(0x8B31,v));attach(p,shader(0x8B30,f));link(p);ok=I();getprogram(p,0x8B82,C.byref(ok));log=C.create_string_buffer(16384);program_log(p,len(log),None,log);assert ok.value,(name,log.value.decode())
 print('PASS GLSL ES 1.00 compile/link:',name)
print('Local GLES MAX_FRAGMENT_UNIFORM_VECTORS =',limit.value,'(not a physical mobile device)')
