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
    manifest = ["CACHE MANIFEST"]
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if '.manifest' in file or '.appcache' in file:
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

    return manifest

parser = argparse.ArgumentParser(description="Gerador de arquivo cache.manifest para EduGps4 / Eduxds2.")
parser.add_argument("directory_path", nargs='?', default='./',
                    help="O diretório para gerar o cache (padrão: './').")
parser.add_argument("-a", "--root-appcache", action="store_true",
                    help="Gera o manifesto se o index.html estiver na raiz.")
parser.add_argument("-b", "--sub-appcache", action="store_true",
                    help="Gera o manifesto se o index.html estiver em um subdiretório (ex: document/pt/ps4/index.html).")
parser.add_argument("-ab", "--both-appcache", action="store_true",
                    help="Gera ambas as estruturas de manifesto. (Padrão)")
parser.add_argument("-cf", "--cloudflare-workaround", action="store_true",
                    help="Contorna o redirecionamento 308 do Cloudflare ao buscar o index.html.")
args = parser.parse_args()

if args.root_appcache or args.sub_appcache:
    args.both_appcache = False
else:
    args.root_appcache = True
    args.sub_appcache = True
   

if args.sub_appcache:
    cache_manifest = generate_cache_manifest(args.directory_path, True)

    output_path = "cache.manifest"
    output_path = output_path.replace("\\","/")

    with open(output_path, "w") as manifest_file:
        manifest_file.write("\n".join(cache_manifest))

    print(f"Manifesto de cache gerado em: '{output_path}'")


if args.root_appcache:
    cache_manifest = generate_cache_manifest(args.directory_path, False)

    output_path = "cache.manifest"
    output_path = os.path.join(args.directory_path, output_path)
    output_path = output_path.replace("\\","/")

    with open(output_path, "w") as manifest_file:
        manifest_file.write("\n".join(cache_manifest))

    print(f"Manifesto de cache gerado em: '{output_path}'")
