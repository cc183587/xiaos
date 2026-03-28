import re

# 读取 HTML 文件
with open('index -backup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 找到 apiFetch 函数并替换为本地版本
# 查找 async function apiFetch
pattern = r"async function apiFetch\(path, options = \{\}\)\{"

new_api_fetch = """async function apiFetch(path, options = {}){
  // 本地模式：返回模拟数据，不实际调用 API
  console.log('[本地模式] API调用:', path);

  // 返回空的成功响应
  return {};
}"""

# 替换整个 apiFetch 函数
matches = list(re.finditer(pattern, html_content))
if matches:
    match = matches[0]
    start_pos = match.start()

    # 找到函数的结束位置
    brace_count = 0
    in_func = False
    end_pos = -1

    for i in range(start_pos, len(html_content)):
        char = html_content[i]
        if char == '{':
            if not in_func:
                in_func = True
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and in_func:
                end_pos = i + 1
                break

    if end_pos > start_pos:
        html_content = html_content[:start_pos] + new_api_fetch + html_content[end_pos:]

        # 保存文件
        with open('index -backup.html', 'w', encoding='utf-8') as f:
            f.write(html_content)

        print("成功！apiFetch 函数已修改为本地模式")
        print("现在页面不会再尝试调用后端 API")
    else:
        print("错误：未找到 apiFetch 函数的结束位置")
else:
    print("错误：未找到 apiFetch 函数")
