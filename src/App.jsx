import React from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, Link } from 'react-router-dom';

const { Header, Content, Footer } = Layout;

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Menu theme="dark" mode="horizontal" selectable={false}>
          <Menu.Item key="chunks">
            <Link to="/chunks">Chunks</Link>
          </Menu.Item>
          <Menu.Item key="sources">
            <Link to="/sources">Sources</Link>
          </Menu.Item>
        </Menu>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Admin Panel ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
