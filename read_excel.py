import pandas as pd
import sys

excel_file = '(生产登记表)表格视图.xlsx'

try:
    # 读取 Excel 文件
    xls = pd.ExcelFile(excel_file)
    print('Sheets:', xls.sheet_names)
    
    # 读取所有 sheet
    df_dict = pd.read_excel(excel_file, sheet_name=None)
    print('Total sheets:', len(df_dict))
    
    for name, data in df_dict.items():
        print(f'\n===== Sheet: {name} =====')
        print('Columns:', data.columns.tolist())
        print('Rows:', len(data))
        print('\nFirst 5 rows:')
        print(data.head(5).to_string())
        print('\n')
        
except Exception as e:
    print('Error:', str(e))
    sys.exit(1)
