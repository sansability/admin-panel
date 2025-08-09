// src/pages/Chunks.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Space,
  Spin,
} from "antd";
import { supabase } from "../utils/supabaseClient";

const { Option } = Select;

function parseTagsInput(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function Chunks() {
  const [data, setData] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchChunks(), fetchSources()]);
    setLoading(false);
  }

  async function fetchChunks() {
    const { data, error } = await supabase
      .from("chunks")
      .select("*, sources(*)")
      .order("created_at", { ascending: false });
    if (error) {
      message.error(error.message);
      return;
    }
    setData(data);
  }

  async function fetchSources() {
    const { data, error } = await supabase
      .from("sources")
      .select("id, title")
      .order("created_at", { ascending: false });
    if (error) {
      message.error(error.message);
      return;
    }
    setSources(data);
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    form.setFieldsValue({
      source_id: record.source_id,
      page_number: record.page_number,
      timestamp: record.timestamp,
      text: record.text,
      summary: record.summary,
      tags: (record.tags || []).join(", "),
    });
    setModalOpen(true);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("chunks").delete().eq("id", id);
    if (error) return message.error(error.message);
    message.success("Deleted");
    fetchChunks();
  }

  async function onFinish(values) {
    const payload = {
      source_id: values.source_id,
      page_number: values.page_number ? Number(values.page_number) : null,
      timestamp: values.timestamp || null,
      text: values.text,
      summary: values.summary || null,
      tags: parseTagsInput(values.tags),
    };

    try {
      if (editing) {
        const { error } = await supabase.from("chunks").update(payload).eq("id", editing.id);
        if (error) throw error;
        message.success("Updated chunk");
      } else {
        const { data: created, error } = await supabase.from("chunks").insert([payload]).select().single();
        if (error) throw error;
        message.success("Created chunk");
      }
      setModalOpen(false);
      fetchChunks();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  }

  const columns = [
    {
      title: "Text",
      dataIndex: "text",
      key: "text",
      render: (t) => <div style={{ maxWidth: 500, whiteSpace: "normal" }}>{t}</div>,
    },
    { title: "Summary", dataIndex: "summary", key: "summary" },
    {
      title: "Source",
      key: "source",
      render: (_, row) => (row.sources ? row.sources.title : row.source_id),
    },
    {
      title: "Page / Timestamp",
      key: "pt",
      render: (r) => r.page_number || r.timestamp || "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete chunk?" onConfirm={() => handleDelete(r.id)}>
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openCreate}>
          Add Chunk
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={fetchAll}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <Table dataSource={data} columns={columns} rowKey="id" />
      )}

      <Modal title={editing ? "Edit Chunk" : "Add Chunk"} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="source_id" label="Source" rules={[{ required: true }]}>
            <Select placeholder="Select source">
              {sources.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="page_number" label="Page number">
            <Input />
          </Form.Item>

          <Form.Item name="timestamp" label="Timestamp (e.g. 00:03:45)">
            <Input />
          </Form.Item>

          <Form.Item name="text" label="Text" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item name="summary" label="Summary">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="tags" label="Tags (comma separated)">
            <Input placeholder="e.g. उद्देश्य, ज्ञान" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button htmlType="submit" type="primary">
                {editing ? "Update" : "Create"}
              </Button>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
