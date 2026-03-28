import pandas as pd

# 读取 Excel 文件
excel_file = '(生产登记表)表格视图.xlsx'
df = pd.read_excel(excel_file, sheet_name='表格视图')

# 填充 NaN 为空字符串
df = df.fillna('')

# 生成 HTML 表格
html_table = df.to_html(index=False, classes='data-table', border=1)

# 完整的 HTML 页面
html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>生产登记表 - 数据展示</title>
<style>
  * {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Microsoft YaHei, sans-serif;
  }}
  body {{
    background: #f0f2f5;
    padding: 20px;
    min-height: 100vh;
  }}
  h1 {{
    font-size: 24px;
    text-align: center;
    margin: 20px 0;
    color: #c0392b;
    font-weight: bold;
  }}
  .container {{
    max-width: 95%;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow-x: auto;
  }}
  .data-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }}
  .data-table th,
  .data-table td {{
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
    min-width: 80px;
  }}
  .data-table th {{
    background: #007AFF;
    color: white;
    font-weight: bold;
    position: sticky;
    top: 0;
  }}
  .data-table tr:hover {{
    background: #f5f5f5;
  }}
  .data-table tr:nth-child(even) {{
    background: #f9f9f9;
  }}
  .info {{
    text-align: center;
    margin: 20px 0;
    padding: 15px;
    background: #e8f4ff;
    border-radius: 8px;
    color: #007AFF;
  }}
</style>
</head>
<body>
<h1>🎀 生产登记表 - 数据展示</h1>

<div class="info">
  总记录数：{len(df)} 条
</div>

<div class="container">
  {html_table}
</div>

</body>
</html>
'''

# 保存到文件
output_file = 'index-backup.html'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'HTML 文件已生成: {output_file}')
print(f'总记录数: {len(df)}')
