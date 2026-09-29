import os
import hashlib
import argparse

def calculate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        data = f.read()
        sha256_hash.update(data)
    return sha256_hash.hexdigest()

def generate_cache_manifest(directory_path, include_directory_path=True, include_payloads=True):
    manifest = ["CACHE MANIFEST", "# EduGps4 - Cache Manifest Auto-Generated"]
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            # Ignora manifestos antigos, geradores e imagens brutas não utilizadas
            if file.endswith('.appcache') or file == 'cache.manifest' or 'appcache_manifest_generator' in file or file.endswith('.jpg'):
                continue
                
            file_path = os.path.join(root, file)

            if not include_payloads and 'payload' in root:
                continue
            
            file_hash = calculate_file_hash(file_path)
            
            if args.cloudflare_workaround and file == 'index.html':
                file_path = file_path.replace("index.html","")
                if file_path.isspace() or file_path == '':
                    file_path = '/'

            if include_directory_path:
                manifest_path = file_path
            else:
                manifest_path = os.path.relpath(file_path, directory_path)
                if manifest_path.isspace() or manifest_path == '' or manifest_path == '.':
                    manifest_path = '/'
                
            manifest_path = manifest_path.replace("\\","/")
            manifest.append(manifest_path + " #" + file_hash)

    manifest.append("\nNETWORK:\n*")
    return manifest

parser = argparse.ArgumentParser(description="Gera o arquivo cache.manifest para o EduGps4.")
parser.add_argument("directory_path", nargs='?', default='./',
                    help="Diretório base para gerar o cache (Padrão: './').")
parser.add_argument("-cf", "--cloudflare-workaround", action="store_true",
                    help="Ajuste para Cloudflare (Redirecionamento 308 do index.html).")
args = parser.parse_args()

# Gera o manifesto na raiz da pasta selecionada
cache_manifest = generate_cache_manifest(args.directory_path, False)

output_path = os.path.join(args.directory_path, "cache.manifest")
output_path = output_path.replace("\\", "/")

with open(output_path, "w", encoding="utf-8") as manifest_file:
    manifest_file.write("\n".join(cache_manifest))

print(f"[OK] Cache manifest do EduGps4 gerado com sucesso em: '{output_path}'")
